/**
 * Shared booking display helpers.
 *
 * A booking's stored `status` only tells us whether it was cancelled or still being
 * assembled — whether it is upcoming, in progress or over is derived from the
 * reservation window. These helpers are used by both the pass check-in cards and the
 * customer detail view so the two never drift apart.
 */

export type BookingDisplayStatus =
  | 'Reserved'
  | 'Active'
  | 'Expired'
  | 'Cancelled'
  | 'In progress'
  | 'Unknown';

// Color mappings via standard Bootstrap classes.
// Update the class strings below if you need customized colors!
const STATUS_STYLES: Record<BookingDisplayStatus, { bg: string; border: string }> = {
  'Active': { bg: 'bg-success text-white', border: 'border-success' },
  'Expired': { bg: 'bg-secondary text-white', border: 'border-secondary' },
  'Cancelled': { bg: 'bg-danger text-white', border: 'border-danger' },
  'Reserved': { bg: 'bg-warning text-dark', border: 'border-warning' },
  'In progress': { bg: 'bg-info text-dark', border: 'border-info' },
  'Unknown': { bg: 'bg-light text-dark', border: 'border-light' }
};

// Bookings the customer can still turn up and use.
const CURRENT_STATUSES: BookingDisplayStatus[] = ['Reserved', 'Active'];

// Bookings that are over, one way or another. 'In progress' is in neither list: the
// booking was never completed, so it is not something the customer holds, but it is
// also not part of their history.
const PAST_STATUSES: BookingDisplayStatus[] = ['Expired', 'Cancelled', 'Unknown'];

/**
 * Coerce a stored temporal anchor to epoch ms. Anchors are written as ISO strings but
 * have also been seen as numeric epochs and numeric strings, and may be absent.
 */
function toEpoch(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const numeric = Number(value.trim());
    return isNaN(numeric) ? null : numeric;
  }

  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? null : parsed;
}

export function getDisplayStatus(booking: any): BookingDisplayStatus {
  if (booking?.status === 'cancelled') return 'Cancelled';
  if (booking?.status === 'in progress') return 'In progress';

  const now = Date.now();
  const checkInTime = toEpoch(booking?.reservationContext?.checkInTime);
  const checkOutTime = toEpoch(booking?.reservationContext?.checkOutTime);

  // Without a usable window there is nothing to derive a status from — say so rather
  // than defaulting to 'Active' and telling staff a stale booking is still usable.
  if (checkInTime === null && checkOutTime === null) {
    return 'Unknown';
  }

  if (checkInTime !== null && now < checkInTime) {
    return 'Reserved';
  }

  if (checkOutTime !== null && now > checkOutTime) {
    return 'Expired';
  }

  return 'Active';
}

export function getStatusClasses(booking: any): { bg: string; border: string } {
  return STATUS_STYLES[getDisplayStatus(booking)] || STATUS_STYLES['Unknown'];
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
  return PAST_STATUSES.includes(getDisplayStatus(booking));
}

// Get the party size for a booking. The API stores the demographic breakdown as
// partyContext (partyInformation on the OpenSearch documents); quantity is the
// last-resort fallback for records that never carried a breakdown.
export function getPartySize(booking: any): number {
  if (booking?.partySize) return booking.partySize;

  const party = booking?.partyContext || booking?.partyInformation;
  if (party) {
    const total =
      (party.adult || 0) +
      (party.senior || 0) +
      (party.youth || 0) +
      (party.child || 0);
    if (total) return total;
  }

  if (booking?.quantity) return booking.quantity;
  return booking?.['numberOfGuests'] || 0;
}

// Get the location string for a booking, combining geozone and facility if available
export function getLocation(booking: any): string {
  const facilityName = booking?.facilityDisplayName || '';
  const geozoneName = booking?.geozoneDisplayName || '';
  return [geozoneName, facilityName].filter(Boolean).join(', ');
}

// displayName is stored as "Product name, <dates>" — take the product name only
export function getProductDisplayName(displayName: any): string {
  if (!displayName) return 'N/A';
  return String(displayName).split(',')[0]?.trim() || 'N/A';
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
