import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { LoggerService } from './logger.service';
import { ToastService, ToastTypes } from './toast.service';
import { Constants } from '../app.constants';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  constructor(
    private dataService: DataService,
    private toastService: ToastService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService
  ) { }

  async getActivity(collectionId, activityType, activityId, getFacilities = false) {
    const queryParams = {};
    if (activityType) {
      queryParams['activityType'] = activityType;
    }
    if (activityId) {
      queryParams['activityId'] = activityId;
    }
    if (getFacilities) {
      queryParams['fetchFacilities'] = true;
    }

    try {
      this.loadingService.addToFetchList(Constants.dataIds.ACTIVITY_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`activities/${collectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.ACTIVITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.loggerService.error(error);
      return null;
    }
  }

  async createActivity(collectionId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.ACTIVITY_RESULT);

      const res = (await lastValueFrom(this.apiService.post(`activities/${collectionId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.ACTIVITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.toastService.addMessage(
        `Activity: ${res[0]?.data?.displayName} created`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Activity failed to create`,
        ToastTypes.ERROR
      );
    }
  }

  async updateActivity(collectionId, activityType, activityId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.ACTIVITY_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`activities/${collectionId}/${activityType}/${activityId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.ACTIVITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.toastService.addMessage(
        `Activity successfully updated`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Activity failed to create`,
        ToastTypes.ERROR
      );
    }
  }

  async getActivitiesByCollectionId(collectionId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.ACTIVITIES_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`activities/${collectionId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.ACTIVITIES_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITIES_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITIES_RESULT);
      this.loggerService.error(error);
    }
  }

  async deleteActivity(collectionId, activityType, activityId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.ACTIVITY_RESULT);
      const res = (await lastValueFrom(this.apiService.delete(`activities/${collectionId}/${activityType}/${activityId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.ACTIVITY_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.toastService.addMessage(
        `Activity successfully deleted`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.ACTIVITY_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Activity failed to delete`,
        ToastTypes.ERROR
      );
    }
  }
}

