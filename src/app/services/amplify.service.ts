import { Injectable } from '@angular/core';
import { Amplify } from "aws-amplify";
import { ConfigService } from './config.service';
import { promises } from 'fs';

@Injectable({
  providedIn: 'root'
})
export class AmplifyService {
  constructor(private configService: ConfigService) {
  }

  async init() {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: this.configService.config['USER_POOL_ID'],
          userPoolClientId: this.configService.config['USER_POOL_CLIENT_ID'],
          identityPoolId: this.configService.config['IDENTITY_POOL_ID'],
          loginWith: {
            oauth: {
              domain: this.configService.config['OAUTH_DOMAIN'],
              scopes: ['openid'],
              redirectSignIn: ['http://localhost:4300/callback'],
              redirectSignOut: ['http://localhost:4300/logout'],
              responseType: 'code',
            }
          },
        },
      },
    });
    return Promise.resolve();
  }
}
