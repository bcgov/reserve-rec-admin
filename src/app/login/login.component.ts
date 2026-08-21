import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // The header renders a logged-in state app-wide, so serving the login
    // choices to an already-authenticated user contradicts it, and the buttons
    // kick off a pointless OAuth round-trip (#360). Send them to the dashboard
    // instead. Reads the same session signal UserGuard trusts, which the app
    // initializer has already populated by the time this runs.
    if (this.authService.session()?.tokens) {
      this.router.navigate(['/']);
    }
  }

  onLogin(provider: string) {
    this.authService.loginWithProvider(provider);
    }
  logout() {
    // Redirect to the logout page
    this.router.navigate(['/logout']);
  }
}
