import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { SidebarService } from '../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { signInWithRedirect, getCurrentUser, fetchAuthSession, signOut, fetchUserAttributes } from 'aws-amplify/auth';
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

  private subscriptions = new Subscription();
  public isAuthenticed = false;
  public session;
  public envName: string;
  public showBanner = true;
  public welcomeMsg: string;
  public isAuthorized: boolean;
  public routes: any[] = [];

  constructor(
    protected configService: ConfigService,
    protected sidebarService: SidebarService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
  ) {
    this.subscriptions.add(
      sidebarService.routes.subscribe((routes) => {
        this.routes = routes;
      })
    );

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

    // Change this to a back-end service.
    setInterval(async () => {
      this.session = await fetchAuthSession();
      if (this?.session?.tokens?.idToken?.payload != null) {
        this.isAuthenticed = true;
      } else {
        this.isAuthenticed = false;
      }
      this.changeDetectorRef.detectChanges();
    }, 15000);
  }

  public async onLoginLogoutClick(inOrOut: string) {
    
    if (inOrOut === 'login') {
      this.router.navigate(['/login']);
    } else {
      signOut();
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
    this.subscriptions.unsubscribe();
  }
}
