import {
  formatBookedDate,
  getCardBorderClass,
  getDisplayStatus,
  getLocation,
  getPartySize,
  getProductDisplayName,
  getStatusBgClass,
  isCurrentBooking,
  isPastBooking,
} from './booking-status';

describe('booking-status utils', () => {
  const now = Date.now();

  it('derives the display status from the reservation window', () => {
    expect(getDisplayStatus({ status: 'cancelled' })).toBe('Cancelled');
    expect(getDisplayStatus({ reservationContext: { checkOutTime: now + 1000 } })).toBe('Active');
    expect(getDisplayStatus({ reservationContext: { checkOutTime: now - 1000 } })).toBe('Expired');
    expect(getDisplayStatus({
      status: 'confirmed',
      reservationContext: { checkInTime: now + 500, checkOutTime: now + 1000 },
    })).toBe('Reserved');
  });

  it('treats a cancelled booking as cancelled regardless of its window', () => {
    expect(getDisplayStatus({
      status: 'cancelled',
      reservationContext: { checkInTime: now + 500, checkOutTime: now + 1000 },
    })).toBe('Cancelled');
  });

  it('maps each status onto its badge and border classes', () => {
    const active = { reservationContext: { checkOutTime: now + 1000 } };
    expect(getStatusBgClass(active)).toBe('bg-success text-white');
    expect(getCardBorderClass(active)).toBe('border-success');

    const cancelled = { status: 'cancelled' };
    expect(getStatusBgClass(cancelled)).toBe('bg-danger text-white');
    expect(getCardBorderClass(cancelled)).toBe('border-danger');
  });

  it('reports an incomplete booking as In progress, in neither list', () => {
    // 'in progress' is the status a booking carries while it is being assembled; it
    // was never completed, so it is neither something the customer holds nor history.
    const inProgress = {
      status: 'in progress',
      reservationContext: { checkInTime: now + 500, checkOutTime: now + 1000 },
    };

    expect(getDisplayStatus(inProgress)).toBe('In progress');
    expect(isCurrentBooking(inProgress)).toBe(false);
    expect(isPastBooking(inProgress)).toBe(false);
  });

  it('reports Unknown when the reservation window is missing or unparseable', () => {
    expect(getDisplayStatus({ status: 'confirmed' })).toBe('Unknown');
    expect(getDisplayStatus({ status: 'confirmed', reservationContext: {} })).toBe('Unknown');
    expect(getDisplayStatus({
      reservationContext: { checkInTime: null, checkOutTime: undefined },
    })).toBe('Unknown');
    expect(getDisplayStatus({
      reservationContext: { checkInTime: 'not a date', checkOutTime: 'nonsense' },
    })).toBe('Unknown');
  });

  it('classifies an Unknown booking as past with a neutral badge', () => {
    const unknown = { status: 'confirmed' };

    expect(isCurrentBooking(unknown)).toBe(false);
    expect(isPastBooking(unknown)).toBe(true);
    expect(getStatusBgClass(unknown)).toBe('bg-light text-dark');
    expect(getCardBorderClass(unknown)).toBe('border-light');
  });

  it('accepts temporal anchors as numeric epochs and numeric strings', () => {
    expect(getDisplayStatus({
      reservationContext: { checkInTime: now + 500, checkOutTime: now + 1000 },
    })).toBe('Reserved');
    expect(getDisplayStatus({
      reservationContext: { checkInTime: String(now + 500), checkOutTime: String(now + 1000) },
    })).toBe('Reserved');
    expect(getDisplayStatus({
      reservationContext: { checkOutTime: String(now - 1000) },
    })).toBe('Expired');
  });

  it('classifies reserved and active bookings as current, expired and cancelled as past', () => {
    const reserved = { reservationContext: { checkInTime: now + 500, checkOutTime: now + 1000 } };
    const active = { reservationContext: { checkOutTime: now + 1000 } };
    const expired = { reservationContext: { checkOutTime: now - 1000 } };
    const cancelled = { status: 'cancelled' };

    expect(isCurrentBooking(reserved)).toBe(true);
    expect(isCurrentBooking(active)).toBe(true);
    expect(isCurrentBooking(expired)).toBe(false);
    expect(isCurrentBooking(cancelled)).toBe(false);

    expect(isPastBooking(expired)).toBe(true);
    expect(isPastBooking(cancelled)).toBe(true);
    expect(isPastBooking(active)).toBe(false);
  });

  it('reads party size from partyContext, falling back to quantity', () => {
    expect(getPartySize({ partyContext: { adult: 2, senior: 1, youth: 1, child: 1 } })).toBe(5);
    // OpenSearch documents carry the same breakdown under partyInformation
    expect(getPartySize({ partyInformation: { adult: 2, child: 1 } })).toBe(3);
    expect(getPartySize({ partySize: 4 })).toBe(4);
    expect(getPartySize({ quantity: 4 })).toBe(4);
    // An empty breakdown must not shadow the quantity fallback
    expect(getPartySize({ partyContext: {}, quantity: 2 })).toBe(2);
    expect(getPartySize({})).toBe(0);
  });

  it('joins location parts without a leading separator', () => {
    expect(getLocation({ geozoneDisplayName: 'Garibaldi', facilityDisplayName: 'Elfin Lakes' }))
      .toBe('Garibaldi, Elfin Lakes');
    expect(getLocation({ geozoneDisplayName: 'Garibaldi' })).toBe('Garibaldi');
    expect(getLocation({ facilityDisplayName: 'Elfin Lakes' })).toBe('Elfin Lakes');
    expect(getLocation({})).toBe('');
  });

  it('takes the product name off the front of the display name', () => {
    expect(getProductDisplayName('Joffre Lakes, 2026-07-01')).toBe('Joffre Lakes');
    expect(getProductDisplayName('Joffre Lakes')).toBe('Joffre Lakes');
    expect(getProductDisplayName(undefined)).toBe('N/A');
  });

  it('formats the booked date and tolerates a missing timestamp', () => {
    // 1704067200000 is Jan 1, 2024
    expect(formatBookedDate(1704067200000)).toBe('2024-01-01');
    expect(formatBookedDate(0)).toBe('N/A');
  });
});
