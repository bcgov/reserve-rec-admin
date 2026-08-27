import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root',
}) export class LoginGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(): boolean | UrlTree {
        if (this.authService.session()?.tokens) {
            return this.router.parseUrl('/');
        }

        return true;
    }
}