import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';

interface ApiResponse {
  code: number;
  data: any;
  msg: string;
  error: any;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  // Set by the customers list right before navigating to a detail route, since
  // router navigation `state` isn't reliably readable in a lazy-loaded
  // (loadComponent) child's ngOnInit by the time its chunk resolves.
  selectedCustomer: any = null;

  constructor(
    private apiService: ApiService,
    private logger: LoggerService
  ) {}

  /**
   * Search users using OpenSearch (full-text search across email, name, phone, etc.)
   */
  async searchCustomers(params: {
    query?: string;
    limit?: number;
    from?: number;
  }) {
    try {
      const body: any = {
        limit: params.limit || 20,
        from: params.from || 0
      };
      
      // Only add query if provided (empty query returns all users)
      if (params.query) {
        body.query = params.query;
      }
      
      const res = await firstValueFrom(this.apiService.post('users/search', body)) as ApiResponse;
      return res;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Fetch every booking belonging to a customer, identified by their Cognito sub.
   * `lastEvaluatedKey` is echoed back from a previous response to fetch the next page.
   */
  async getCustomerBookings(
    sub: string,
    opts: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      lastEvaluatedKey?: any;
    } = {}
  ) {
    try {
      const queryParams: any = {};
      if (opts.startDate) queryParams.startDate = opts.startDate;
      if (opts.endDate) queryParams.endDate = opts.endDate;
      if (opts.limit) queryParams.limit = opts.limit;
      if (opts.lastEvaluatedKey) {
        queryParams.lastEvaluatedKey = JSON.stringify(opts.lastEvaluatedKey);
      }

      const res = await firstValueFrom(
        this.apiService.get(
          `bookings/admin/user/${encodeURIComponent(sub)}`,
          Object.keys(queryParams).length ? queryParams : null
        )
      ) as ApiResponse;
      return res;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
