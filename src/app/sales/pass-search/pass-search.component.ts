import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { PassDetailsComponent } from '../pass-details/pass-details.component';
export interface FilterCriteria {
  checkinStatus: string;
  email: string;
  endDate: string;
  startDate: string;
}

@Component({
  selector: 'app-pass-search-component',
  standalone: true,
  imports: [CommonModule, FormsModule, PassDetailsComponent],
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
  bookings: any = [];

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
    private toastService: ToastService
  ) { }

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

    // Pass the raw criteria directly to the backend
    const status = this.filterCriteria.checkinStatus;
    const startDate = this.filterCriteria.startDate;
    const endDate = this.filterCriteria.endDate;

    try {
      if (newSearch) {
        this.isLoading = true;
        this.currentPage = 0;
      } else {
        this.currentPage = page;
      }

      const searchTerms = {
        text: this.keyword.trim(),
        from: this.currentPage * this.pageSize,
        size: this.pageSize,
        sortField: 'startDate',
        sortOrder: 'desc',
        email: this.filterCriteria.email?.trim() || undefined,
        checkinStatus: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const res = await lastValueFrom(
        this.apiService.post('bookings/search', searchTerms)
      );
      
      this.totalHits = res['data']?.['total']?.['value'] || 0;
      const hits = res['data']?.['hits'] || [];
      const bookingsSearch = hits.map((hit: any) => hit._source || hit);

      if (newSearch) {
        this.bookings = bookingsSearch;
      } else {
        this.bookings = [...this.bookings, ...bookingsSearch];
      }

    } catch (error) {
      const errorMessage = 
        (error as any)?.error?.msg ||
        (error as any)?.error?.error ||
        (error as any)?.error?.message ||
        (error as any)?.message ||
        'Unknown error';
      this.toastService.addMessage(
        errorMessage,
        `Search failed`,
        ToastTypes.ERROR
      );
      return null;
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

  onFilterChange() {
    if (this.keyword && this.keyword.trim().length >= 2) {
      this.search(true, 0);
    }
  }

  clearAllFilters() {
    this.filterCriteria = { email: '', checkinStatus: '', startDate: '', endDate: '' };
    if (this.keyword && this.keyword.trim().length >= 2) {
      this.search(true, 0);
    } else {
      this.bookings = [];
    }
  }

  toggleFilterPanel() {
    this.showFilterPanel = !this.showFilterPanel;
  }
}
