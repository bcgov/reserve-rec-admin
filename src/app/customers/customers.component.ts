import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomerService } from '../services/customer.service';
import { LoggerService } from '../services/logger.service';
import { LoadingService } from '../services/loading.service';
import { RealtimeEvent, RealtimeService } from '../services/realtime.service';
import { AuthService } from '../services/auth.service';
import { Utils, csvField } from '../utils/utils';
import { ToastService, ToastTypes } from '../services/toast.service';
import { DateTime } from 'luxon';

// The API returns at most 100 users per search; OpenSearch pages no deeper than 10,000.
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_ROWS = 10000;

const HIGHLIGHT_MS = 5000;

@Component({
  selector: 'app-customers',
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit, OnDestroy {
  customers: any[] = [];
  currentOffset = 0;
  pageSize = 20;
  hasMore = false;
  loading = false;
  exporting = false;
  searchQuery = '';
  sortField: string = 'email';
  sortOrder: 'asc' | 'desc' = 'asc';
  showFilterModal = false;
  showingDetail = false;
  highlightedIds = new Set<string>();
  // The query whose results are on screen; live rows and Load More follow it.
  private appliedQuery = '';
  private loadSeq = 0;
  // Live rows received since the latest reload started, kept if the reload misses them.
  private arrivals = new Map<string, any>();
  private subscriptions = new Subscription();
  private highlightTimers = new Set<ReturnType<typeof setTimeout>>();

  private utils = new Utils();

  // Column visibility configuration
  availableColumns = [
    { field: 'email', label: 'Email', visible: true, sortable: true },
    { field: 'name', label: 'Name', visible: true, sortable: true },
    { field: 'mobilePhone', label: 'Mobile Phone', visible: true, sortable: true },
    { field: 'phoneNumber', label: 'Home Phone', visible: false, sortable: true },
    { field: 'streetAddress', label: 'Street Address', visible: false, sortable: true },
    { field: 'postalCode', label: 'Postal Code', visible: false, sortable: true },
    { field: 'province', label: 'Province', visible: false, sortable: true },
    { field: 'activeBooking', label: 'Active Booking', visible: true, sortable: true },
    { field: 'accountType', label: 'Account Type', visible: false, sortable: true },
    { field: 'emailVerified', label: 'Email Verified', visible: false, sortable: true }
  ];
  
  constructor(
    private router: Router,
    private customerService: CustomerService,
    private logger: LoggerService,
    private loadingService: LoadingService,
    private realtimeService: RealtimeService,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  async ngOnInit() {
    // The server refuses staff until REALTIME_STAFF_ADDED_ENABLED is on; drop this check when it is.
    if (this.authService.isSuperAdmin()) {
      this.subscriptions.add(this.realtimeService.topic$('customers')
        .subscribe((event) => this.onCustomerEvent(event)));
      this.subscriptions.add(this.realtimeService.reconnected$.subscribe(() => this.catchUp()));
    }
    await this.loadCustomers();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.highlightTimers.forEach((timer) => clearTimeout(timer));
    this.highlightTimers.clear();
  }

  onCustomerEvent(event: RealtimeEvent) {
    if (event.type !== 'created' && event.type !== 'added') {
      return;
    }
    const row = { ...event.data, sub: event.id, live: true, ...(event.type === 'created' && { hasActiveBooking: false }) };
    this.arrivals.set(row.sub, row);
    if (this.unlisted([row]).length && this.matchesSearch(row, this.appliedQuery)) {
      this.prependCustomers([row]);
    }
  }

  // Approximates the server search (any word, as a substring, without fuzziness).
  private matchesSearch(customer: any, query: string) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      return true;
    }
    const values = [
      customer.givenName, customer.familyName, customer.email,
      customer.mobilePhone,
    ].filter((value) => typeof value === 'string').map((value) => value.toLowerCase());
    return words.some((word) => values.some((value) => value.includes(word)));
  }

  // Events sent while the connection was down are lost; pick up any new customers on page 1.
  private async catchUp() {
    if (this.appliedQuery) {
      return;
    }
    try {
      const results = await this.customerService.searchCustomers({ limit: this.pageSize, from: 0 });
      if (this.appliedQuery) {
        return;
      }
      const fresh = this.unlisted(results?.data?.hits || []);
      this.prependCustomers(fresh);
      await this.loadActiveBookingFlags(fresh);
    } catch (error) {
      this.logger.error(error);
    }
  }

  // Rows not already on screen, matched on sub; rows without a sub are kept.
  private unlisted(rows: any[]) {
    const listed = new Set(this.customers.map((customer) => customer?.sub));
    return rows.filter((row) => !row?.sub || !listed.has(row.sub));
  }

  private prependCustomers(rows: any[]) {
    if (!rows.length) {
      return;
    }
    this.customers = [...rows, ...this.customers];
    for (const row of rows) {
      this.highlightedIds.add(row.sub);
      const timer = setTimeout(() => {
        this.highlightedIds.delete(row.sub);
        this.highlightTimers.delete(timer);
      }, HIGHLIGHT_MS);
      this.highlightTimers.add(timer);
    }
  }

  async loadCustomers(append = false) {
    const seq = ++this.loadSeq;
    const query = append ? this.appliedQuery : this.searchQuery.trim();
    if (!append) {
      this.arrivals.clear();
    }
    try {
      this.loading = true;
      this.loadingService.addToFetchList('customers');

      const searchResults = await this.customerService.searchCustomers({
        query: query || undefined,
        limit: this.pageSize,
        from: append ? this.currentOffset : 0
      });
      if (seq !== this.loadSeq) {
        return; // a newer load replaced this one
      }

      const users = searchResults?.data?.hits || [];
      let added = users;

      if (append) {
        // Pages come by offset, so new signups or a shifting match order can push
        // already-listed customers onto this page.
        added = this.unlisted(users);
        this.customers = [...this.customers, ...added];
        this.currentOffset += users.length;
      } else {
        const arrived = [...this.arrivals.values()].filter((row) => this.matchesSearch(row, query)
          && !users.some((user) => user.sub === row.sub));
        this.customers = [...arrived, ...users];
        this.currentOffset = users.length;
        this.appliedQuery = query;
      }

      // If we got fewer results than requested, there are no more
      this.hasMore = users.length === this.pageSize;

      this.logger.info(`Loaded ${this.customers.length} customers`);

      await this.loadActiveBookingFlags(added);
    } catch (error) {
      this.logger.error(error);
    } finally {
      if (seq === this.loadSeq) {
        this.loading = false;
        this.loadingService.removeFromFetchList('customers');
      }
    }
  }

  // The user index has no booking data, so Active Booking comes from the booking
  // search: one request per batch of customers.
  private async loadActiveBookingFlags(customers: any[]) {
    const subs = customers.map((customer) => customer?.sub).filter(Boolean);
    if (!subs.length) return;

    try {
      const subsWithBooking = await this.customerService.getSubsWithCurrentBooking(subs);
      for (const customer of customers) {
        customer.hasActiveBooking = subsWithBooking.has(customer?.sub);
      }
    } catch (error) {
      // The column falls back to '-' rather than claiming every customer has nothing.
      this.logger.error(error);
    }
  }

  async loadMore() {
    if (this.hasMore && !this.loading) {
      await this.loadCustomers(true);
    }
  }

  async onSearch() {
    this.currentOffset = 0;
    await this.loadCustomers(false);
  }

  getValue(customer: any, field: string): string {
    if (field === 'name') {
      const firstName = customer?.givenName || '';
      const lastName = customer?.familyName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || '-';
    }
    
    if (field === 'activeBooking') {
      if (customer?.hasActiveBooking === undefined) return '-';
      return customer.hasActiveBooking ? 'yes' : 'no';
    }

    if (field === 'accountType') {
      const status = customer?.userStatus;
      if (status === 'EXTERNAL_PROVIDER') {
        return 'BCSC';
      } else if (status === 'CONFIRMED' || status === 'UNCONFIRMED') {
        return 'BCP Account';
      }
      return '-';
    }
    
    if (field === 'verified') {
      const status = customer?.userStatus;
      if (status === 'CONFIRMED' || status === 'EXTERNAL_PROVIDER') {
        return 'Yes';
      } else if (status === 'UNCONFIRMED') {
        return 'No';
      }
      return '-';
    }
    
    if (field === 'emailVerified') {
      const status = customer?.userStatus;
      // BCSC accounts are always considered email verified
      if (status === 'EXTERNAL_PROVIDER') {
        return 'Yes';
      }
      // BCP Accounts use the actual email_verified field
      if (status === 'CONFIRMED' || status === 'UNCONFIRMED') {
        return customer?.email_verified === true ? 'Yes' : 'No';
      }
      return '-';
    }
    
    return customer?.[field] || '-';
  }

  viewCustomer(customer: any) {
    if (customer.sub) {
      this.customerService.selectedCustomer = customer;
      this.router.navigate(['/customers', customer.sub]);
    } else {
      this.logger.error('Customer ID (sub) not found');
    }
  }


  // Exports the visible columns for every customer matching the search on screen.
  async downloadCSV() {
    if (this.exporting) return;
    this.exporting = true;
    try {
      const rows = await this.fetchAllForExport();
      const columns = this.getVisibleColumns();
      const cell = (customer: any, field: string) => {
        const value = this.getValue(customer, field);
        return csvField(value === '-' ? '' : value);
      };
      const lines = [
        columns.map(column => csvField(column.label)).join(','),
        ...rows.map(customer => columns.map(column => cell(customer, column.field)).join(',')),
      ];
      this.utils.downloadCSV(`customers-${DateTime.now().toFormat('yyyy-LL-dd')}.csv`, lines.join('\n'));
      if (rows.length >= EXPORT_MAX_ROWS) {
        this.toastService.addMessage(
          `Only the first ${EXPORT_MAX_ROWS.toLocaleString()} customers were downloaded. Search to narrow the list.`,
          'Customers',
          ToastTypes.WARNING,
        );
      }
    } catch (error) {
      this.logger.error(error);
      this.toastService.addMessage('The customer download failed. Try again.', 'Customers', ToastTypes.ERROR);
    } finally {
      this.exporting = false;
    }
  }

  private async fetchAllForExport(): Promise<any[]> {
    const query = this.appliedQuery || undefined;
    const rows: any[] = [];
    const seen = new Set<string>();
    let from = 0;
    while (rows.length < EXPORT_MAX_ROWS) {
      const page = (await this.customerService.searchCustomers({ query, limit: EXPORT_PAGE_SIZE, from }))?.data?.hits || [];
      from += page.length;
      const fresh = page.filter((customer: any) => !seen.has(customer.sub));
      // An empty page, or one holding only rows already seen, means the matches have run out.
      if (!fresh.length) break;
      fresh.forEach((customer: any) => seen.add(customer.sub));
      rows.push(...fresh);
    }
    const exported = rows.slice(0, EXPORT_MAX_ROWS);
    if (this.getVisibleColumns().some(column => column.field === 'activeBooking')) {
      for (let i = 0; i < exported.length; i += EXPORT_PAGE_SIZE) {
        await this.loadActiveBookingFlags(exported.slice(i, i + EXPORT_PAGE_SIZE));
      }
    }
    return exported;
  }

  openFilters() {
    this.showFilterModal = true;
  }

  closeFilterModal() {
    this.showFilterModal = false;
  }

  getVisibleColumns() {
    return this.availableColumns.filter(col => col.visible);
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to ascending
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    
    // Sort the existing customers array client-side
    this.sortCustomers();
  }

  private sortCustomers() {
    this.customers.sort((a, b) => {
      let aValue = this.getValue(a, this.sortField);
      let bValue = this.getValue(b, this.sortField);
      
      // Handle '-' as empty values (sort to end)
      if (aValue === '-') aValue = '';
      if (bValue === '-') bValue = '';
      
      // Case-insensitive string comparison
      const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'bi-arrow-down-up'; 
    }
    return this.sortOrder === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up';
  }
}
