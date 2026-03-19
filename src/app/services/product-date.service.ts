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
export class ProductDateService {
  constructor(
    private dataService: DataService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService
  ) { }

  async getProductDates(collectionId: string, activityType: string, activityId: string | number, productId: string | number, startDate?: string, endDate?: string) {
    const queryParams: Record<string, string> = {};
    if (startDate) queryParams['startDate'] = startDate;
    if (endDate) queryParams['endDate'] = endDate;

    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_DATE_LIST);
      const res = (await lastValueFrom(this.apiService.get(`product-dates/${collectionId}/${activityType}/${activityId}/${productId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_DATE_LIST, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_DATE_LIST);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_DATE_LIST);
      this.loggerService.error(error);
      return null;
    }
  }
}
