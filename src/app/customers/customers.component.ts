import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../services/customer.service';
import { LoggerService } from '../services/logger.service';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-customers',
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit {
  customers: any[] = [];
  currentOffset = 0;
  pageSize = 20;
  hasMore = false;
  loading = false;
  searchQuery = '';
  sortField: string = 'email';
  sortOrder: 'asc' | 'desc' = 'asc';
  showFilterModal = false;

  // Column visibility configuration
  availableColumns = [
    { field: 'email', label: 'Email', visible: true, sortable: true },
    { field: 'givenName', label: 'First Name', visible: true, sortable: true },
    { field: 'familyName', label: 'Last Name', visible: true, sortable: true },
    { field: 'phoneNumber', label: 'Phone', visible: true, sortable: true },
    { field: 'mobilePhone', label: 'Mobile Phone', visible: false, sortable: true },
    { field: 'streetAddress', label: 'Street Address', visible: false, sortable: true },
    { field: 'postalCode', label: 'Postal Code', visible: false, sortable: true },
    { field: 'province', label: 'Province', visible: false, sortable: true },
    { field: 'licensePlate', label: 'License Plate', visible: false, sortable: true },
    { field: 'vehicleRegLocale', label: 'Vehicle Reg Locale', visible: false, sortable: true },
    { field: 'activeBooking', label: 'Active Booking', visible: true, sortable: false }
  ];
  
  constructor(
    private router: Router,
    private customerService: CustomerService,
    private logger: LoggerService,
    private loadingService: LoadingService
  ) {}

  async ngOnInit() {
    await this.loadCustomers();
  }

  async loadCustomers(append = false) {
    try {
      this.loading = true;
      this.loadingService.addToFetchList('customers');
      
      const searchResults = await this.customerService.searchCustomers({ 
        query: this.searchQuery.trim() || undefined,
        limit: this.pageSize,
        from: append ? this.currentOffset : 0
      });

      const users = searchResults?.data?.hits || [];

      if (append) {
        this.customers = [...this.customers, ...users];
        this.currentOffset += users.length;
      } else {
        this.customers = users;
        this.currentOffset = users.length;
      }
      
      // If we got fewer results than requested, there are no more
      this.hasMore = users.length === this.pageSize;

      this.logger.info(`Loaded ${this.customers.length} customers`);
    } catch (error) {
      this.logger.error(error);
    } finally {
      this.loading = false;
      this.loadingService.removeFromFetchList('customers');
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
    return customer?.[field] || '-';
  }

  viewCustomer(customer: any) {
    if (customer.sub) {
      this.router.navigate(['/customers', customer.sub], {
        state: { customer: customer }
      });
    } else {
      this.logger.error('Customer ID (sub) not found');
    }
  }

  editCustomer(customer: any) {
    if (customer.sub) {
      this.router.navigate(['/customers', customer.sub, 'edit'], {
        state: { customer: customer }
      });
    } else {
      this.logger.error('Customer ID (sub) not found');
    }
  }

  copyCustomer(customer: any) {
    console.log('Copy customer button clicked');
    // TODO: Implement copy functionality once requirements are determined
  }

  printCustomers() {
    console.log('Print button clicked');
    // TODO: Implement print functionality
  }

  createNewCustomer() {
    console.log('Create new customer button clicked');
    // TODO: Implement create new customer functionality
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
