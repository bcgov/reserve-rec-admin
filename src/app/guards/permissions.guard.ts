import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

/**
 * Guards routes that require a minimum permission tier.
 *
 * Route data options:
 *   requiredPermission: 'limited' | 'staff'  — minimum tier required
 *
 * If the route has a `collectionId` path param the check is scoped to that
 * specific collection (park). Otherwise the user just needs the tier on any
 * collection they manage.
 *
 * Superadmins always pass.
 *
 * Example:
 *   canActivate: [UserGuard, PermissionsGuard]
 *   data: { requiredPermission: 'staff' }
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionsGuard implements CanActivate {
  constructor(private permissionsService: PermissionsService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (this.permissionsService.isSuperAdmin()) {
      return true;
    }

    const required: string | undefined = route.data?.['requiredPermission'];
    if (!required) {
      return true;
    }

    const collectionId = this.resolveParam(route, 'collectionId');
    return this.permissionsService.hasPermission(required, collectionId ?? undefined)
      ? true
      : this.router.parseUrl('/unauthorized');
  }

  // Walk up the activated route snapshot tree to find a named param
  private resolveParam(route: ActivatedRouteSnapshot, param: string): string | null {
    let current: ActivatedRouteSnapshot | null = route;
    while (current) {
      if (current.params[param]) {
        return current.params[param];
      }
      current = current.parent;
    }
    return null;
  }
}
