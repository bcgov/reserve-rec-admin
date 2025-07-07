import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { SidebarService } from '../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { signInWithRedirect, getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Router } from '@angular/router';
import { AmplifyService } from '../services/amplify.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  constructor(private router: Router, private authService: AmplifyService) {}

  onLogin(provider: string) {
    this.authService.loginWithProvider(provider);
    }
  logout() {
    // Redirect to the logout page
    this.router.navigate(['/logout']);
  }


}