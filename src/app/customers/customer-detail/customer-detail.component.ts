import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { LoggerService } from '../../services/logger.service';
import {
  formatBookedDate,
  getCardBorderClass,
  getDisplayStatus,
  getStatusBgClass,
  isCurrentBooking,
} from '../../utils/booking-status';

const BOOKINGS_PAGE_SIZE = 20;

@Component({
  selector: 'app-customer-detail',
  imports: [CommonModule],
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss'
})
export class CustomerDetailComponent implements OnInit {
  customer: any = null;
  customerId: string | null = null;

  currentBookings: any[] = [];
  pastBookings: any[] = [];

  bookingsLoading = false;
  bookingsLoadingMore = false;
  bookingsError: string | null = null;
  private bookingsLastEvaluatedKey: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private logger: LoggerService
  ) {}

  async ngOnInit() {
    // The route param is the customer's Cognito sub, which is also the userId
    // every booking is stored against.
    this.customerId = this.route.snapshot.paramMap.get('id');
    this.customer = this.customerService.selectedCustomer;

    if (this.customerId) {
      await this.loadBookings();
    }
  }

  get hasMoreBookings(): boolean {
    return !!this.bookingsLastEvaluatedKey;
  }

  async loadBookings(append = false) {
    if (!this.customerId) return;

    try {
      if (append) {
        this.bookingsLoadingMore = true;
      } else {
        this.bookingsLoading = true;
        this.bookingsError = null;
        this.currentBookings = [];
        this.pastBookings = [];
        this.bookingsLastEvaluatedKey = null;
      }

      const res = await this.customerService.getCustomerBookings(this.customerId, {
        limit: BOOKINGS_PAGE_SIZE,
        lastEvaluatedKey: append ? this.bookingsLastEvaluatedKey : undefined,
      });

      const items = res?.data?.items || [];
      this.bookingsLastEvaluatedKey = res?.data?.lastEvaluatedKey || null;

      for (const booking of items) {
        if (isCurrentBooking(booking)) {
          this.currentBookings.push(booking);
        } else {
          this.pastBookings.push(booking);
        }
      }
    } catch (error) {
      this.logger.error(error);
      this.bookingsError = 'Unable to load bookings for this customer.';
    } finally {
      this.bookingsLoading = false;
      this.bookingsLoadingMore = false;
    }
  }

  // Booking display helpers (shared with the pass check-in cards)

  getDisplayStatus(booking: any): string {
    return getDisplayStatus(booking);
  }

  getStatusBgClass(booking: any): string {
    return getStatusBgClass(booking);
  }

  getCardBorderClass(booking: any): string {
    return getCardBorderClass(booking);
  }

  formatBookedDate(bookingCompletionTime: number): string {
    return formatBookedDate(bookingCompletionTime);
  }

  getBookingTitle(booking: any): string {
    const displayName = booking?.displayName || '';
    return displayName.split(',')[0]?.trim() || booking?.activityType || 'Booking';
  }

  getBookingLocation(booking: any): string {
    const facilityName = booking?.facilityDisplayName || '';
    const geozoneName = booking?.geozoneDisplayName || '';
    return `${geozoneName}${facilityName ? (geozoneName ? ', ' : '') + facilityName : ''}`;
  }

  getBookingDates(booking: any): string {
    const startDate = booking?.startDate;
    const endDate = booking?.endDate;
    if (!startDate) return '-';
    if (!endDate || endDate === startDate) return startDate;
    return `${startDate} to ${endDate}`;
  }

  getPartySize(booking: any): number {
    if (booking?.partySize) return booking.partySize;
    const p = booking?.partyInformation;
    if (p) {
      return (p.adult || 0) + (p.senior || 0) + (p.youth || 0) + (p.child || 0);
    }
    if (booking?.quantity) return booking.quantity;
    return booking?.['numberOfGuests'] || 0;
  }

  backToCustomerList() {
    this.router.navigate(['/customers']);
  }

  editCustomer() {
    console.log('Determine edit functionality');
  }

  getFullName(): string {
    const firstName = this.customer?.givenName || '';
    const lastName = this.customer?.familyName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || '-';
  }

  isEmailVerified(): boolean {
    const status = this.customer?.userStatus;
    // BCSC accounts are always considered email verified
    if (status === 'EXTERNAL_PROVIDER') {
      return true;
    }
    // BCP Accounts use the actual email_verified field
    if (status === 'CONFIRMED' || status === 'UNCONFIRMED') {
      return this.customer?.email_verified === true;
    }
    return false;
  }

  printCustomer() {
    console.log('Print customer button was pressed');
    // TODO: Waiting for designs on how this should look/function
  }

  addSale() {
    console.log('Add sale button was pressed');
    // TODO: On designs but functionality not determined
  }
}
