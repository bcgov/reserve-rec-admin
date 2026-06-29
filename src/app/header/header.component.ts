import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { SidebarService } from '../services/sidebar.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { Router } from '@angular/router';

@Component({
    selector: 'app-header',
    imports: [CommonModule, RouterModule,],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    standalone: true
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showSideBar = true;

  public isAuthenticed = false;
  public session;
  public envName: string;
  public showBanner = true;
  private sessionPollId: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(
    protected configService: ConfigService,
    protected sidebarService: SidebarService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private authService: AuthService,
  ) {
    this.envName = this.configService.config['ENVIRONMENT'];
    if (this.envName === 'prod') {
      this.showBanner = false;
    }
  }

  async ngOnInit() {
    try {
      // Check if user is already signed in, throws if not
      await getCurrentUser();
      this.isAuthenticed = true;
     } catch (e) {
      console.log(e);
    }

    // Poll the auth session every 15s to refresh the "logged in?" badge.
    // The interval id is tracked so ngOnDestroy can clear it — without that
    // the poll keeps firing after the component leaves, including during
    // logout, racing the sign-out and producing the visible console/network
    // errors reported in #269.
    this.sessionPollId = setInterval(async () => {
      if (this.destroyed) return;
      try {
        this.session = await fetchAuthSession();
        if (this.destroyed) return;
        this.isAuthenticed = !!this?.session?.tokens?.idToken?.payload;
        this.changeDetectorRef.detectChanges();
      } catch (e) {
        // Expected mid-logout — session is being torn down. Don't surface as
        // an error to the user; just stop polling until next mount.
        this.isAuthenticed = false;
      }
    }, 15000);
  }

  public async onLoginLogoutClick(inOrOut: string) {
    if (inOrOut === 'login') {
      this.router.navigate(['/login']);
      return;
    }
    // Stop the auth-session poll first so it can't race the sign-out and
    // log network errors to the console. Then delegate to AuthService.logout
    // which awaits Amplify signOut + clears the user/session signals.
    if (this.sessionPollId) {
      clearInterval(this.sessionPollId);
      this.sessionPollId = null;
    }
    try {
      await this.authService.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  async logUser() {
    try {
        const user = await fetchUserAttributes();
       
    } catch (err) {
        console.log('No authenticated user:', err);
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    if (this.sessionPollId) {
      clearInterval(this.sessionPollId);
      this.sessionPollId = null;
    }
  }
}
