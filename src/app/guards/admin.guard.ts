import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private permissionsService: PermissionsService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.permissionsService.isSuperAdmin()) {
      return true;
    }
    return this.router.parseUrl('/unauthorized');
  }
}
