import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { lastValueFrom } from 'rxjs';

interface FilterCriteria {
  email: string;
  checkinStatus: string;
  startDate: string;
  endDate: string;
}

interface Booking {
  bookingId: string;
  collectionId: string;
  activityType: string;
  activityId: string;
  startDate: string;
  endDate: string;
  displayName?: string;
  bookingCompletionTime?: number;
  bookingStatus?: string;
  bookedAt?: string;
  checkedInAt?: string;
  partySize?: number;
  facilityName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  namedOccupant?: {
    firstName?: string;
    lastName?: string;
    contactInfo?: { email?: string };
  };
  entryPoint?: { text?: string; sk?: string; category?: string };
  partyInformation?: { adult?: number; senior?: number; youth?: number; child?: number };
  [key: string]: any;
}

@Component({
    selector: 'app-pass-search-component',
    imports: [CommonModule, FormsModule],
    templateUrl: './pass-search.component.html',
    styleUrl: './pass-search.component.scss'
})
export class PassSearchComponent {
  keyword = '';

  filterCriteria: FilterCriteria = {
    email: '',
    checkinStatus: '',
    startDate: '',
    endDate: ''
  };

  // Results
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];

  // Pagination
  readonly pageSize = 5;
  currentPage = 0;
  totalHits = 0;

  get totalPages(): number {
    return Math.ceil(this.totalHits / this.pageSize);
  }

  // UI state
  isLoading = false;
  isLoadingMore = false;
  showFilterPanel = false;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private loggerService: LoggerService
  ) {}

  get filtersApplied(): boolean {
    return !!(
      this.filterCriteria.email ||
      this.filterCriteria.checkinStatus ||
      this.filterCriteria.startDate ||
      this.filterCriteria.endDate
    );
  }

  async search(newSearch = true, page = 0) {
    if (!this.keyword || this.keyword.trim().length < 2) {
      this.toastService.addMessage(
        'Please enter at least 2 characters to search',
        'Search',
        ToastTypes.WARNING
      );
      return;
    }
    try {
      // Only show whole page load spinner on initial/fresh search
      if (newSearch) {
        this.isLoading = true;
      }
      this.currentPage = page;
      const res = await lastValueFrom(
        this.apiService.post('bookings/search', {
          text: this.keyword.trim(),
          size: this.pageSize,
          from: page * this.pageSize,
          sortField: 'startDate',
          sortOrder: 'desc'
        })
      );
      this.totalHits = res['data']?.['total']?.['value'] || 0;
      const hits = res['data']?.['hits'] || [];
      // Search for bookings
      const bookingsSearch = hits.map((hit: any) => hit._source || hit);
      // Remove the bookings on a new search; append on "load more"
      if (newSearch) {
        this.bookings = bookingsSearch
      } else {
        this.bookings = [...this.bookings, ...bookingsSearch];
      }

      this.applyLocalFilters();
    } catch (error) {
      this.handleError('Search failed', error);
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.isLoadingMore = true;
      this.search(false, page);
    }
  }

  applyLocalFilters() {
    let results = [...this.bookings];

    if (this.filterCriteria.email) {
      const emailLower = this.filterCriteria.email.toLowerCase();
      results = results.filter(booking => {
        const email = booking.email || booking.namedOccupant?.contactInfo?.email || '';
        return email.toLowerCase().includes(emailLower);
      });
    }

    if (this.filterCriteria.checkinStatus) {
      results = results.filter(booking =>
        this.getDisplayStatus(booking).toLowerCase() === this.filterCriteria.checkinStatus.toLowerCase()
      );
    }

    if (this.filterCriteria.startDate) {
      results = results.filter(booking => booking.startDate >= this.filterCriteria.startDate);
    }

    if (this.filterCriteria.endDate) {
      results = results.filter(booking => booking.startDate <= this.filterCriteria.endDate);
    }

    this.filteredBookings = results;
  }

  clearAllFilters() {
    this.filterCriteria = { email: '', checkinStatus: '', startDate: '', endDate: '' };
    this.applyLocalFilters();
  }

  toggleFilterPanel() {
    this.showFilterPanel = !this.showFilterPanel;
  }

  async checkinBooking(booking: Booking) {
    try {
      this.isLoading = true;
      await lastValueFrom(
        this.apiService.post(`bookings/${booking.bookingId}/checkin`, {})
      );
      booking.checkedInAt = new Date().toISOString();
      booking.bookingStatus = 'active';
      this.toastService.addMessage('Check-in successful', 'Success', ToastTypes.SUCCESS);
      this.applyLocalFilters();
    } catch (error) {
      this.handleError('Check-in failed', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Display helpers

  getBookingName(booking: Booking): string {
    const firstName = booking.firstName || booking.namedOccupant?.firstName || '';
    const lastName = booking.lastName || booking.namedOccupant?.lastName || '';
    return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  }

  getBookingEmail(booking: Booking): string {
    return booking.email || booking.namedOccupant?.contactInfo?.email || '';
  }

  getDisplayStatus(booking: Booking): string {
    if (booking.bookingStatus === 'cancelled') return 'Cancelled';
    if (booking.checkedInAt) return 'Active';
    return 'Reserved';
  }

  // Get the CSS class for the status badge based on booking status
  getStatusBadgeClass(booking: Booking): string {
    switch (this.getDisplayStatus(booking)) {
      case 'Active': return 'badge-status-active';
      case 'Cancelled': return 'badge-status-cancelled';
      default: return 'badge-status-reserved';
    }
  }

  // Get the CSS class for the card border based on booking status
  getCardBorderClass(booking: Booking): string {
    switch (this.getDisplayStatus(booking)) {
      case 'Active': return 'card-border-active';
      case 'Cancelled': return 'card-border-cancelled';
      default: return 'card-border-reserved';
    }
  }

  // Check and display the check-in status of the booking
  isCheckedIn(booking: Booking): boolean {
    return booking.checkedInAt !== undefined && booking.checkedInAt !== '';
  }

  // Get the party size for a booking, calculating from party information (if available)
  getPartySize(booking: Booking): number {
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
  getLocation(booking: Booking): string {
    const facility = booking.facilityName || '';
    const entryPoint = booking.entryPoint?.text || '';
    return [facility, entryPoint].filter(Boolean).join(', ');
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
  formatCheckinTime(checkedInAt: string): string {
    if (!checkedInAt) return '';
    try {
      const d = new Date(checkedInAt);
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const date = d.toISOString().split('T')[0];
      return `${time}, ${date}`;
    } catch {
      return checkedInAt;
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
