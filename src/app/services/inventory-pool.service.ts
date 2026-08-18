import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { LoggerService } from './logger.service';
import { Constants } from '../app.constants';

@Injectable({
  providedIn: 'root',
})
export class InventoryPoolService {
  constructor(
    private dataService: DataService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService
  ) { }

  async getInventoryPools(collectionId: string, activityType: string, activityId: string | number, productId: string | number, startDate?: string, endDate?: string, date?: string) {
    const queryParams: Record<string, string> = {};
    if (startDate) queryParams['startDate'] = startDate;
    if (endDate) queryParams['endDate'] = endDate;
    if (date && !startDate && !endDate) queryParams['date'] = date;

    try {
      this.loadingService.addToFetchList(Constants.dataIds.INVENTORY_POOL_LIST);
      const res = (await lastValueFrom(this.apiService.get(`inventory-pools/${collectionId}/${activityType}/${activityId}/${productId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.INVENTORY_POOL_LIST, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.INVENTORY_POOL_LIST);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.INVENTORY_POOL_LIST);
      this.loggerService.error(error);
      return null;
    }
  }

  async updateInventoryPool(
    collectionId: string,
    activityType: string,
    activityId: string | number,
    productId: string | number,
    date: string,
    capacity: number,
    editMode: 'manual' | 'bulk' = 'bulk',
    notes?: string,
    preCloseCapacity?: number
  ) {
    const queryParams: Record<string, string> = {
      'date': date,
      'editMode': editMode
    };

    const body: any = {
      capacity: capacity
    };

    // Add preCloseCapacity if provided (when closing a date)
    if (preCloseCapacity !== undefined && preCloseCapacity !== null) {
      body.preCloseCapacity = preCloseCapacity;
    }

    // Add notes if provided
    if (notes !== undefined && notes !== null) {
      body.notes = notes;
    }

    try {
      this.loadingService.addToFetchList(Constants.dataIds.INVENTORY_POOL_LIST);
      const res = (await lastValueFrom(this.apiService.put(`inventory-pools/${collectionId}/${activityType}/${activityId}/${productId}`, body, queryParams)))['data'];
      this.loadingService.removeFromFetchList(Constants.dataIds.INVENTORY_POOL_LIST);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.INVENTORY_POOL_LIST);
      this.loggerService.error(error);
      throw error;
    }
  }
}
