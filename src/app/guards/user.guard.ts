import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // Read from the cached session signal — no Cognito network call on every navigation
    if (this.authService.session()?.tokens) {
      return true;
    }
    return this.router.parseUrl('/login');
  }
}