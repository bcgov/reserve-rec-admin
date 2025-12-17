import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { LoadingService } from '../services/loading.service';
import { ToastService, ToastTypes } from '../services/toast.service';
import { LoggerService } from '../services/logger.service';
import { lastValueFrom } from 'rxjs';

interface BookingSearchFilters {
  collectionId?: string;
  activityType?: string;
  activityId?: string;
  startDate?: string;
  endDate?: string;
  bookingId?: string;
  keyword?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface Booking {
  bookingId: string;
  collectionId: string;
  activityType: string;
  activityId: string;
  startDate: string;
  endDate: string;
  numberOfGuests?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  [key: string]: any;
}

interface SearchResponse {
  items: Booking[];
  lastEvaluatedKey?: any;
  hasMore: boolean;
}

@Component({
    selector: 'app-sales-component',
    imports: [CommonModule, FormsModule],
    templateUrl: './sales.component.html',
    styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private keywordSearch$ = new Subject<string>();

  // Search filters
  filters: BookingSearchFilters = {
    limit: 20,
    sortBy: 'startDate',
    sortOrder: 'desc'
  };

  // Results
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  numberOfPermits = 0;
  
  // UI state
  isLoading = false;
  showFilters = true;
  searchMode: 'filters' | 'keyword' = 'filters';
  lastEvaluatedKey: any = null;
  hasMore = false;
  selectedBooking: Booking | null = null;
  showBookingDetails = false;

  // Filter options (these could be populated from reference data)
  collectionOptions: string[] = [];
  activityTypeOptions: string[] = ['day-use', 'camping', 'backcountry'];
  activityIdOptions: string[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 20;

  constructor(
    private apiService: ApiService,
    private loadingService: LoadingService,
    private toastService: ToastService,
    private loggerService: LoggerService
  ) {}

  ngOnInit() {
    // Set up keyword search with debounce
    this.keywordSearch$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(keyword => {
      if (keyword && keyword.length >= 2) {
        this.searchByKeyword(keyword);
      } else if (!keyword) {
        this.clearResults();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadBookings() {
    try {
      this.isLoading = true;
      const response = await this.searchBookings();
      this.processSearchResults(response);
    } catch (error) {
      this.handleError('Failed to load bookings', error);
    } finally {
      this.isLoading = false;
    }
  }

  async searchBookings(): Promise<SearchResponse> {
    const queryParams: any = {
      limit: this.filters.limit || 20,
      sortBy: this.filters.sortBy || 'startDate',
      sortOrder: this.filters.sortOrder || 'desc'
    };

    // Add filters if they exist
    if (this.filters.collectionId) queryParams.collectionId = this.filters.collectionId;
    if (this.filters.activityType) queryParams.activityType = this.filters.activityType;
    if (this.filters.activityId) queryParams.activityId = this.filters.activityId;
    if (this.filters.startDate) queryParams.startDate = this.filters.startDate;
    if (this.filters.endDate) queryParams.endDate = this.filters.endDate;
    if (this.filters.bookingId) queryParams.bookingId = this.filters.bookingId;
    if (this.lastEvaluatedKey) queryParams.lastEvaluatedKey = JSON.stringify(this.lastEvaluatedKey);

    const res = await lastValueFrom(
      this.apiService.get('bookings/admin', queryParams)
    );

    console.log('res2 >>>', res);

    return res['data'] as SearchResponse;
  }

  async searchByKeyword(keyword: string) {
    if (!keyword || keyword.length < 2) {
      return;
    }

    try {
      this.isLoading = true;
      const body = {
        text: keyword
      };

      const res = await lastValueFrom(
        this.apiService.post('bookings/search', body)
      );

      const hits = res['data']?.['hits'] || [];
      this.bookings = hits.map((hit: any) => hit._source || hit);
      this.filteredBookings = [...this.bookings];
      this.numberOfPermits = this.bookings.length;
      this.hasMore = false; // OpenSearch doesn't use pagination the same way
    } catch (error) {
      this.handleError('Keyword search failed', error);
    } finally {
      this.isLoading = false;
    }
  }

  processSearchResults(response: SearchResponse) {
    if (this.lastEvaluatedKey) {
      // Append to existing results for pagination
      this.bookings = [...this.bookings, ...response.items];
    } else {
      // New search
      this.bookings = response.items || [];
    }
    
    this.filteredBookings = [...this.bookings];
    this.numberOfPermits = this.bookings.length;
    this.lastEvaluatedKey = response.lastEvaluatedKey;
    this.hasMore = response.hasMore || false;
  }

  onKeywordChange(keyword: string) {
    this.filters.keyword = keyword;
    this.keywordSearch$.next(keyword);
  }

  toggleSearchMode(mode: 'filters' | 'keyword') {
    this.searchMode = mode;
    this.clearResults();
    if (mode === 'filters') {
      this.filters.keyword = '';
      this.loadBookings();
    }
  }

  applyFilters() {
    this.lastEvaluatedKey = null;
    this.currentPage = 1;
    this.loadBookings();
  }

  clearFilters() {
    this.filters = {
      limit: 20,
      sortBy: 'startDate',
      sortOrder: 'desc'
    };
    this.clearResults();
    this.loadBookings();
  }

  clearResults() {
    this.bookings = [];
    this.filteredBookings = [];
    this.numberOfPermits = 0;
    this.lastEvaluatedKey = null;
    this.hasMore = false;
  }

  async loadMore() {
    if (this.hasMore && !this.isLoading) {
      this.currentPage++;
      await this.loadBookings();
    }
  }

  async viewBookingDetails(booking: Booking) {
    try {
      this.isLoading = true;
      // Fetch full booking details by bookingId
      const queryParams = {
        bookingId: booking.bookingId
      };
      
      const res = await lastValueFrom(
        this.apiService.get('bookings/admin', queryParams)
      );

      this.selectedBooking = res['data'];
      this.showBookingDetails = true;
    } catch (error) {
      this.handleError('Failed to load booking details', error);
    } finally {
      this.isLoading = false;
    }
  }

  closeBookingDetails() {
    this.selectedBooking = null;
    this.showBookingDetails = false;
  }

  createNew() {
    // Navigate to create new booking page or open modal
    this.toastService.addMessage(
      'Create new booking functionality coming soon',
      'Info',
      ToastTypes.INFO
    );
  }

  exportResults() {
    // Export current results to CSV
    const csv = this.convertToCSV(this.filteredBookings);
    this.downloadCSV(csv, 'bookings-export.csv');
  }

  private convertToCSV(data: Booking[]): string {
    if (!data || data.length === 0) return '';

    const headers = ['Booking ID', 'Collection', 'Activity Type', 'Activity ID', 'Start Date', 'End Date', 'Status', 'Email'];
    const rows = data.map(booking => [
      booking.bookingId,
      booking.collectionId,
      booking.activityType,
      booking.activityId,
      booking.startDate,
      booking.endDate,
      booking.status || 'N/A',
      booking.email || 'N/A'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private handleError(message: string, error: any) {
    this.loggerService.error(error);
    this.toastService.addMessage(
      error?.message || 'An unexpected error occurred',
      message,
      ToastTypes.ERROR
    );
  }

  // Utility methods for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  toggleFiltersPanel() {
    this.showFilters = !this.showFilters;
  }
}
