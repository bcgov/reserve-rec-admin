import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PolicyService {

  constructor(
    protected dataService: DataService,
    protected loadingService: LoadingService,
    protected apiService: ApiService,
    protected loggerService: LoggerService,
    protected toastService: ToastService
  ) { }

  async getPolicy(policyType, policyId, policyIdVersion = 'latest') {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.POLICY_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`policies/${policyType}/${policyId}/${policyIdVersion}`, {})))['data'];
      this.dataService.setItemValue(Constants.dataIds.POLICY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.POLICY_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.POLICY_RESULT);
      this.loggerService.error(error);
    }
  }

}
