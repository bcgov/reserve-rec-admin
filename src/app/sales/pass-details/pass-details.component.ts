import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-pass-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pass-details.html',
  styleUrl: './pass-details.component.scss'
})
export class PassDetailsComponent {
  @Input() booking!: any;

  // UI state
  isLoading = false;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private loggerService: LoggerService
  ) { }

  async checkinBooking(booking: any) {
    try {
      this.isLoading = true;
      const res = (await lastValueFrom(this.apiService.put(`bookings/${booking.bookingId}/checkin`, {})))['data'];

      booking.checkedInTime = new Date().getTime().toString();
      this.toastService.addMessage('Check-in successful', 'Success', ToastTypes.SUCCESS);
    } catch (error) {
      this.handleError('Check-in failed', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Display helpers

  getBookingName(booking: any): string {
    const firstName = booking.firstName || booking.namedOccupant?.firstName || '';
    const lastName = booking.lastName || booking.namedOccupant?.lastName || '';
    return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  }

  getBookingEmail(booking: any): string {
    return booking.email || booking.namedOccupant?.contactInfo?.email || 'Unknown email';
  }

  getDisplayStatus(booking: any): string {
    if (booking.status === 'cancelled') return 'Cancelled';
    const checkOutTime = booking.reservationContext?.checkOutTime;
    if (booking.checkedInTime && checkOutTime && checkOutTime > Date.now()) return 'Active';
    if (checkOutTime && checkOutTime < Date.now()) return 'Expired';

    return 'Reserved';
  }

  // Get the CSS class configuration for the status
  private readonly statusStyles = {
    'Active': { bg: 'bg-active', border: 'border-active' },
    'Expired': { bg: 'bg-expired', border: 'border-expired' },
    'Cancelled': { bg: 'bg-cancelled', border: 'border-cancelled' },
    'Reserved': { bg: 'bg-reserved', border: 'border-reserved' }
  };

  getStatusClasses(booking: any) {
    return this.statusStyles[this.getDisplayStatus(booking)] || this.statusStyles['Reserved'];
  }

  // Get the CSS class for the status badge/mobile header based on booking status
  getStatusBgClass(booking: any): string {
    return this.getStatusClasses(booking).bg;
  }

  // Get the CSS class for the card border based on booking status
  getCardBorderClass(booking: any): string {
    return this.getStatusClasses(booking).border;
  }

  // Check and display the check-in status of the booking
  canCheckIn(booking: any): boolean {
    const status = booking.status;
    const queryTime = Date.now();
    const checkedInTime = booking?.checkedInTime;
    const checkOutTime = booking.reservationContext.checkOutTime;

    // Any other status but confirmed means no check-in option
    if (status !== 'confirmed') return false;

    // Not checked in yet and not past window (allow early check-in, though)
    return !checkedInTime && checkOutTime > queryTime;
  }

  isCheckedIn(booking: any): boolean {
    return !!booking.checkedInTime;
  }

  // Get the party size for a booking, calculating from party information (if available)
  getPartySize(booking: any): number {
    if (booking.partySize) return booking.partySize;
    const p = booking.partyInformation;
    if (p) {
      return (p.adult || 0) + (p.senior || 0) + (p.youth || 0) + (p.child || 0);
    }
    return booking['numberOfGuests'] || 0;
  }

  // Get a human-readable label for the activity type (known activity types)
  getActivityTypeLabel(activityType: string): string {
    const labels = {
      dayuse: 'Day-use pass',
      camping: 'Camping',
      backcountry: 'Backcountry',
      trail: 'Trail'
    };
    return labels[activityType?.toLowerCase()] || activityType;
  }

  // Get the location string for a booking, combining facility and entry point if available
  getLocation(booking: any): string {
    const facilityName = booking?.facilityDisplayName ? booking?.facilityDisplayName : ''
    const geozoneName = booking?.geozoneDisplayName ? booking?.geozoneDisplayName : ''

    return `${geozoneName}${facilityName ? ', ' + facilityName : ''}`
  }

  // Format the booked date to be readable in the format of "2024-01-01"
  formatBookedDate(bookingCompletionTime: number): string {
    if (!bookingCompletionTime) return 'N/A';
    try {
      const date = new Date(0);
      date.setUTCSeconds(bookingCompletionTime / 1000);
      return date.toISOString().split('T')[0];
    } catch {
      return 'N/A';
    }
  }

  // Format the check in time to be readable in the format of "3:00 PM, 2024-01-01"
  formatCheckedInTime(checkedInTime: string | number): string | number {
    if (!checkedInTime) return '';
    try {
      const d = new Date(checkedInTime);
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const date = d.toISOString().split('T')[0];
      return `${time}, ${date}`;
    } catch {
      return checkedInTime;
    }
  }

  private handleError(message: string, error: any) {
    this.loggerService.error(error);
    this.toastService.addMessage(
      error?.message || 'An unexpected error occurred',
      message,
      ToastTypes.ERROR
    );
  }

}
