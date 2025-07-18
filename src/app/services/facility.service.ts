import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';
import { ToastService, ToastTypes } from './toast.service';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FacilityService {

  constructor(
    protected dataService: DataService,
    protected loadingService: LoadingService,
    protected apiService: ApiService,
    protected loggerService: LoggerService,
    protected toastService: ToastService
  ) { }

  async getFacility(fcCollectionId, facilityType, facilityId, fetchActivities = false) {
    try {
      const params = {
        fetchActivities: fetchActivities
      };
      this.loadingService.addToFetchList(Constants.dataIds.FACILITY_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`facilities/${fcCollectionId}/${facilityType}/${facilityId}`, params)))['data'];
      this.dataService.setItemValue(Constants.dataIds.FACILITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.FACILITY_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.FACILITY_RESULT);
      this.loggerService.error(error);
    }
  }

  async createFacility(fcCollectionId, facilityType, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.FACILITY_RESULT);
      const res = (await lastValueFrom(this.apiService.post(`facilities/${fcCollectionId}/${facilityType}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.FACILITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.FACILITY_RESULT);
      this.toastService.addMessage(
        `Facility: ${res.name} created.`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.FACILITY_RESULT);
      this.toastService.addMessage(
        `${error}`,
        `Facility failed to create`,
        ToastTypes.ERROR
      );
      this.loggerService.error(error);
    }
  }

  async updateFacility(fcCollectionId, facilityType, facilityId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.FACILITY_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`facilities/${fcCollectionId}/${facilityType}/${facilityId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.FACILITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.FACILITY_RESULT);
      this.toastService.addMessage(
        `Facility: ${res.name} updated.`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.toastService.addMessage(
        `${error}`,
        `Facility failed to update`,
        ToastTypes.ERROR
      );
      this.loadingService.removeFromFetchList(Constants.dataIds.FACILITY_RESULT);
      this.loggerService.error(error);
    }
  }

}
