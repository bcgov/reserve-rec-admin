import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { LoggerService } from '../../services/logger.service';
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
  private lastLoadWasAppend = false;

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
    // Guard against a double-tap on "Load more" (or a reload racing the initial
    // fetch) appending the same page twice.
    if (!this.customerId || this.bookingsLoading || this.bookingsLoadingMore) return;

    this.lastLoadWasAppend = append;

    try {
      if (append) {
        this.bookingsLoadingMore = true;
      } else {
        this.bookingsLoading = true;
        this.currentBookings = [];
        this.pastBookings = [];
        this.bookingsLastEvaluatedKey = null;
      }
      this.bookingsError = null;

      const res = await this.customerService.getCustomerBookings(this.customerId, {
        limit: BOOKINGS_PAGE_SIZE,
        lastEvaluatedKey: append ? this.bookingsLastEvaluatedKey : undefined,
      });

      const items = res?.data?.items || [];
      this.bookingsLastEvaluatedKey = res?.data?.lastEvaluatedKey || null;

      for (const booking of items) {
        // A booking that is neither current nor past (an abandoned "in progress"
        // one) belongs in neither list.
        if (isCurrentBooking(booking)) {
          this.currentBookings.push(booking);
        } else if (isPastBooking(booking)) {
          this.pastBookings.push(booking);
        }
      }

      this.sortPastBookingsNewestFirst();
    } catch (error) {
      this.logger.error(error);
      // A failed page must not discard what is already on screen — the sections stay
      // rendered and the message offers a retry.
      this.bookingsError = 'Unable to load bookings for this customer.';
    } finally {
      this.bookingsLoading = false;
      this.bookingsLoadingMore = false;
    }
  }

  retryLoadBookings(): Promise<void> {
    return this.loadBookings(this.lastLoadWasAppend);
  }

  // The API returns newest-first, but paging can interleave, so keep the finished
  // bookings in a stable newest-first order of their own.
  private sortPastBookingsNewestFirst() {
    this.pastBookings.sort((a, b) => {
      const aDate = a?.startDate || '';
      const bDate = b?.startDate || '';
      if (aDate === bDate) return 0;
      return aDate < bDate ? 1 : -1;
    });
  }

  trackBooking(index: number, booking: any): string {
    return booking?.bookingId || booking?.sk || String(index);
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
    return getProductDisplayName(booking?.displayName);
  }

  getBookingLocation(booking: any): string {
    return getLocation(booking);
  }

  getBookingDates(booking: any): string {
    const startDate = booking?.startDate;
    const endDate = booking?.endDate;
    if (!startDate) return '-';
    if (!endDate || endDate === startDate) return startDate;
    return `${startDate} to ${endDate}`;
  }

  getPartySize(booking: any): number {
    return getPartySize(booking);
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
