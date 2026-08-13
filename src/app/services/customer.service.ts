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
}
