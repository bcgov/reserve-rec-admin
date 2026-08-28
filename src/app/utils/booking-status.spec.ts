import {
  formatBookedDate,
  getCardBorderClass,
  getDisplayStatus,
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

  it('formats the booked date and tolerates a missing timestamp', () => {
    // 1704067200000 is Jan 1, 2024
    expect(formatBookedDate(1704067200000)).toBe('2024-01-01');
    expect(formatBookedDate(0)).toBe('N/A');
  });
});
