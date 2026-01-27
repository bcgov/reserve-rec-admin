import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';
import { ToastService, ToastTypes } from './toast.service';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(
    protected dataService: DataService,
    protected loadingService: LoadingService,
    protected apiService: ApiService,
    protected loggerService: LoggerService,
    protected toastService: ToastService
  ) { }

  async getDailyPasses(collectionId: string, arrivalDate: string, facilityId?: string) {
    const dataTag = 'dailyPassesReport';
    try {
      this.loadingService.addToFetchList(dataTag);
      const params: any = {
        collectionId,
        arrivalDate
      };
      if (facilityId) {
        params.facilityId = facilityId;
      }
      const res = await lastValueFrom(this.apiService.get('reports/daily-passes', params));
      this.loadingService.removeFromFetchList(dataTag);
      return res['data']?.items || [];
    } catch (error) {
      this.loadingService.removeFromFetchList(dataTag);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        'Failed to fetch daily passes report',
        ToastTypes.ERROR
      );
      throw error;
    }
  }
}
