import { Injectable } from '@angular/core';

export interface PendingScan {
  bookingId: string;
  hash: string;
}

/**
 * Holds a QR scan (bookingId + hash) captured by the `/verify/:bookingId/:hash`
 * redirect route until the Sales QR scanner page picks it up.
 */
@Injectable({
  providedIn: 'root'
})
export class PendingScanService {
  private pending: PendingScan | null = null;

  setPending(scan: PendingScan): void {
    this.pending = scan;
  }

  takePending(): PendingScan | null {
    const scan = this.pending;
    this.pending = null;
    return scan;
  }
}
