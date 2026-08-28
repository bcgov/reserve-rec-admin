/**
 * Shared booking display helpers.
 *
 * A booking's stored `status` only tells us whether it was cancelled — whether it
 * is upcoming, in progress or over is derived from the reservation window. These
 * helpers are used by both the pass check-in cards and the customer detail view so
 * the two never drift apart.
 */

export type BookingDisplayStatus = 'Reserved' | 'Active' | 'Expired' | 'Cancelled';

// Color mappings via standard Bootstrap classes.
// Update the class strings below if you need customized colors!
const STATUS_STYLES: Record<BookingDisplayStatus, { bg: string; border: string }> = {
  'Active': { bg: 'bg-success text-white', border: 'border-success' },
  'Expired': { bg: 'bg-secondary text-white', border: 'border-secondary' },
  'Cancelled': { bg: 'bg-danger text-white', border: 'border-danger' },
  'Reserved': { bg: 'bg-warning text-dark', border: 'border-warning' }
};

// Bookings the customer can still use, versus ones that are done with.
const CURRENT_STATUSES: BookingDisplayStatus[] = ['Reserved', 'Active'];

export function getDisplayStatus(booking: any): BookingDisplayStatus {
  if (booking?.status === 'cancelled') return 'Cancelled';

  const now = Date.now();
  const checkInTime = booking?.reservationContext?.checkInTime
    ? new Date(booking.reservationContext.checkInTime).getTime()
    : null;
  const checkOutTime = booking?.reservationContext?.checkOutTime
    ? new Date(booking.reservationContext.checkOutTime).getTime()
    : null;

  if (checkInTime && now < checkInTime) {
    return 'Reserved';
  }

  if (checkOutTime && now > checkOutTime) {
    return 'Expired';
  }

  return 'Active';
}

export function getStatusClasses(booking: any): { bg: string; border: string } {
  return STATUS_STYLES[getDisplayStatus(booking)] || STATUS_STYLES['Reserved'];
}

// Get the CSS class for the status badge/mobile header based on booking status
export function getStatusBgClass(booking: any): string {
  return getStatusClasses(booking).bg;
}

// Get the CSS class for the card border based on booking status
export function getCardBorderClass(booking: any): string {
  return getStatusClasses(booking).border;
}

export function isCurrentBooking(booking: any): boolean {
  return CURRENT_STATUSES.includes(getDisplayStatus(booking));
}

export function isPastBooking(booking: any): boolean {
  return !isCurrentBooking(booking);
}

// Format the booked date to be readable in the format of "2024-01-01"
export function formatBookedDate(bookingCompletionTime: number): string {
  if (!bookingCompletionTime) return 'N/A';
  try {
    const date = new Date(0);
    date.setUTCSeconds(bookingCompletionTime / 1000);
    return date.toISOString().split('T')[0];
  } catch {
    return 'N/A';
  }
}
