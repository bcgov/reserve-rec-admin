import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { SidebarService } from '../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { signInWithRedirect, getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  constructor(private router: Router, private authService: AuthService) {}

  onLogin(provider: string) {
    this.authService.loginWithProvider(provider);
    }
  logout() {
    // Redirect to the logout page
    this.router.navigate(['/logout']);
  }


}