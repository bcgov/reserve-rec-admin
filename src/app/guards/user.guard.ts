import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    async canActivate(): Promise<boolean> {
      const user = await this.authService.getCurrentUser();
      if (user) {
        return true; // Allow access if user exists
      } else {
        this.router.navigate(['/login']); // No user exists, redirect to login
        return false;
      }
    }
  }