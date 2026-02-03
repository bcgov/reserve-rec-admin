import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const isAdmin = await this.authService.userIsAdmin();
    if (isAdmin) {
      return true; // Allow access if user is a superadmin
    } else {
      this.router.navigate(['/unauthorized']); // Not a superadmin, redirect to unauthorized
      return false;
    }
  }
}
