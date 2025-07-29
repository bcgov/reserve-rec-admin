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

  async getGeozone(gzCollectionId, geozoneId) {
    const queryParams = {};
    if (geozoneId) {
      queryParams['geozoneId'] = geozoneId;
    }
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`geozones/${gzCollectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.loggerService.error(error);
    }
  }
  
  async getGeozoneByCollectionId(gzCollectionId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONES_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`geozones/${gzCollectionId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONES_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONES_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONES_RESULT);
      this.loggerService.error(error);
    }
  }

  async createGeozone(gzCollectionId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.post(`geozones/${gzCollectionId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.toastService.addMessage(
        `Geozone: ${res.name} created.`,
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

  async updateGeozone(gzCollectionId, geozoneId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`geozones/${gzCollectionId}/${geozoneId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.toastService.addMessage(
        `Geozone: ${res.name} updated.`,
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
}
