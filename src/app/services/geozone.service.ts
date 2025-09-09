import { Injectable } from '@angular/core';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';
import { ToastService, ToastTypes } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class GeozoneService {

  constructor(
    protected dataService: DataService,
    protected loadingService: LoadingService,
    protected apiService: ApiService,
    protected loggerService: LoggerService,
    protected toastService: ToastService
  ) { }

  async getGeozone(collectionId, geozoneId) {
    const queryParams = {};
    if (geozoneId) {
      queryParams['geozoneId'] = geozoneId;
    }
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`geozones/${collectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.loggerService.error(error);
    }
  }
  
  async getGeozoneByCollectionId(collectionId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONES_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`geozones/${collectionId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONES_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONES_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONES_RESULT);
      this.loggerService.error(error);
    }
  }

  async createGeozone(collectionId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.post(`geozones/${collectionId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.toastService.addMessage(
        `Geozone: ${res[0]?.data?.displayName} created`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.toastService.addMessage(
        `${error}`,
        `Geozone failed to create`,
        ToastTypes.ERROR
      );
      this.loggerService.error(error);
    }
  }

  async updateGeozone(collectionId, geozoneId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`geozones/${collectionId}/${geozoneId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.toastService.addMessage(
        `Geozone successfully updated`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.toastService.addMessage(
        `${error}`,
        `Geozone failed to update`,
        ToastTypes.ERROR
      );
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.loggerService.error(error);
    }
  }

  async deleteGeozone(collectionId, geozoneId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.delete(`geozones/${collectionId}/${geozoneId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.toastService.addMessage(
        `Geozone successfully deleted`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Geozone failed to delete`,
        ToastTypes.ERROR
      );
    }
  }
}
