import { Injectable, signal } from '@angular/core';
import { Amplify } from "aws-amplify";
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { signInWithRedirect, fetchUserAttributes, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private configService: ConfigService, private loggerService: LoggerService, private router: Router) {
  }

  public user = signal<any>(null); // Make sure observable for user updates
  public session = signal(null);
  public reDirectValues;
  public allAccessRoleName = 'superadmin';

  async init() {
    console.log('this.configService.config:', this.configService.config);
    console.time('timer');
    if (this.configService.config.ENVIRONMENT === 'local' || !this.configService.config['COGNITO_REDIRECT_URI']) {
      this.reDirectValues = 'http://localhost:4200';
    } else {
      this.reDirectValues = this.configService.config['COGNITO_REDIRECT_URI'];
    }
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: this.configService.config['ADMIN_USER_POOL_ID'],
          userPoolClientId: this.configService.config['ADMIN_USER_POOL_CLIENT_ID'],
          identityPoolId: this.configService.config['ADMIN_IDENTITY_POOL_ID'],
          loginWith: {
            oauth: {
              domain: this.configService.config['ADMIN_USER_POOL_DOMAIN_URL'],
              scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
              redirectSignIn: [this.reDirectValues],
              redirectSignOut: [this.reDirectValues],
              responseType: 'code',
            }
          },
        },
      },
    });
    await this.setRefresh();
    return Promise.resolve();
  }

  loginWithProvider(provider: string) {
    let idpName = '';
    if (provider === 'idir') idpName = 'IDIR';
    else if (provider === 'bceid') idpName = 'BCEID';
    else if (provider === 'bcsc') idpName = 'BCSC';
    else return;
    // Use Amplify's signInWithRedirect method to initiate the OAuth flow instead of custome method
    signInWithRedirect({ provider: { custom: idpName } });
  }

  private async listenToAuthEvents() {
    Hub.listen('auth', async ({ payload }) => {
      switch (payload.event) {
        case 'signedIn': {
          console.timeLog("timer", "In hub signed in");
          const userAttributes = await fetchUserAttributes(); // Await the user attributes
          this.updateUser(userAttributes); // Set the resolved user attributes
          console.log('User attributes:', userAttributes);
          this.loggerService.info('User has signed in successfully.');
          const session = await fetchAuthSession();
          await this.setRefresh();
          this.router.navigate(['/']);
          console.log('Session:', session);
          break;
        }
        case 'signedOut': {
          console.timeLog("timer", "In hub signed out");
          this.loggerService.info('User has signed out successfully.');
          this.updateUser(null);
          this.session.set(null);
          break;
        }
        case 'tokenRefresh': {
          console.timeLog("timer", "In hub refresh");
          this.loggerService.info('Auth tokens have been refreshed.');
          break;
        }
        case 'tokenRefresh_failure': {
          console.timeLog("timer", "In hub refresh failure");
          this.loggerService.info('Failure while refreshing auth tokens.');
          break;
        }
        case 'signInWithRedirect': {
          console.timeLog("timer", "In hub signed in with Redirect");
          this.loggerService.info('signInWithRedirect API has successfully been resolved.');
          break;
        }
        case 'signInWithRedirect_failure': {
          console.timeLog("timer", "In hub signed redirect failure");
          this.loggerService.info('Failure while trying to resolve signInWithRedirect API.');
          break;
        }
      }
    });
  }

  updateUser(user: any) {
    this.user.set(user); // update the signal anytime user changes
  }


  async setRefresh(forceRefresh = false) {
    try {
      this.session.set(await fetchAuthSession({ forceRefresh: forceRefresh }));
      if (this.session().tokens) {
        this.loggerService.debug(JSON.stringify(this.session(), null, 2));
        const refreshInterval = ((this.session().tokens.accessToken.payload.exp * 1000) - Date.now()) / 2;
        if (refreshInterval > 0) {
          setTimeout(async () => {
            try {
              await this.setRefresh(true);
              this.loggerService.info('Token refreshed successfully.');
            } catch (error) {
              console.error('Error refreshing token:', error);
              const currentTime = Date.now() / 1000;
              const refreshTokenExp = this.session().tokens.refreshToken.payload.exp;
              //This is just kicking user out to login page. TODO: Add a modal to confirm logout or stay logged in?
              if (currentTime >= refreshTokenExp) {
                this.loggerService.info('Refresh token expired. Logging out...');
                await this.logout();
                this.router.navigate(['/login']);
              }
            }
          }, refreshInterval);
        }
      }
    } catch (error) {
      console.error('Error setting refresh token:', error);
      await this.logout(); // Log out on error
      this.router.navigate(['/login']); // Redirect to login
    }
  }

  public get jwtToken() {
    const currentSession = this.session();
    return currentSession?.tokens?.accessToken?.toString() || null;
  }


  //Use this to ensure signal gets cleared
  async logout() {
    await signOut();
    this.updateUser(null);
    this.session.set(null);
    console.log('User logged out', this.user);
    this.router.navigate(['/']);
  }

  async getCurrentUser() {
    try {
      const userAttributes = await fetchUserAttributes();
      console.log('Fetching current user attributes...', userAttributes);
      return userAttributes || null;
    } catch (error) {
      this.loggerService.error(`Error fetching current user: ${error}`);
      return null;
    }
  }

  async getAdminRole() {
    try {
      const user = await this.getCurrentUser();
      console.log("The user is: ", user);
      if (user && user['custom:adminRole']) {
        return user['custom:adminRole'];
      }
      return null;
    } catch (error) {
      this.loggerService.error(`Error fetching admin role: ${error}`);
      return null;
    }
  }

  async userIsAdmin() {
    try {
      const role = await this.getAdminRole();
      console.log("The role is: ", role);
      if (role == this.allAccessRoleName) {
        return true;
      }
      return false;
    } catch (error) {
      this.loggerService.error(`Error checking if user is admin: ${error}`);
      return false;
    }
  }

  configEnv() {
    return this.configService.config;
  }
}