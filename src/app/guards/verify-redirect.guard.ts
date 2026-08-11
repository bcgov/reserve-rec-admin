import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { PendingScanService } from '../services/pending-scan.service';

/**
 * Catches `/verify/:bookingId/:hash` (the URL encoded in a booking's QR code)
 * and forwards it into the Sales QR scanner page instead of rendering it directly,
 * so a scan always lands on `/sales/qr-scanner` with the pass details shown.
 */
@Injectable({
  providedIn: 'root',
})
export class VerifyRedirectGuard implements CanActivate {
  constructor(private pendingScanService: PendingScanService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): UrlTree {
    const bookingId = route.paramMap.get('bookingId');
    const hash = route.paramMap.get('hash');

    if (bookingId && hash) {
      this.pendingScanService.setPending({ bookingId, hash });
    }

    return this.router.parseUrl('/sales/qr-scanner');
  }
}
