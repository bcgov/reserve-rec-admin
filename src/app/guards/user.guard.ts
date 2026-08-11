import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    // Read from the cached session signal — no Cognito network call on every navigation
    if (this.authService.session()?.tokens) {
      return true;
    }
    // Stash the intended URL so the post-login callback can return here instead
    // of always landing on home (bcgov/reserve-rec-admin#335)
    sessionStorage.setItem('postLoginRedirectUrl', state.url);
    return this.router.parseUrl('/login');
  }
}