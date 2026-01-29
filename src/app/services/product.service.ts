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
export class ProductService {
  constructor(
    private dataService: DataService,
    private toastService: ToastService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService
  ) { }

  async getProduct(collectionId, activityType, activityId, productId, fetchActivities = false, fetchGeozones = false, fetchFacilities = false) {
    const queryParams = {};
    if (activityType) {
      queryParams['activityType'] = activityType;
    }
    if (activityId) {
      queryParams['activityId'] = activityId;
    }
    if (productId) {
      queryParams['productId'] = productId;
    }
    if (fetchActivities) {
      queryParams['fetchActivities'] = true;
    }
    if (fetchGeozones) {
      queryParams['fetchGeozones'] = true;
    }
    if (fetchFacilities) {
      queryParams['fetchFacilities'] = true;
    }

    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`products/${collectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      return null;
    }
  }

  async getProductsByActivity(collectionId, activityType, activityId) {
    const queryParams = {};
    if (activityType) {
      queryParams['activityType'] = activityType;
    }
    if (activityId) {
      queryParams['activityId'] = activityId;
    }

    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_LIST);
      const res = (await lastValueFrom(this.apiService.get(`products/${collectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_LIST, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_LIST);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_LIST);
      this.loggerService.error(error);
      return null;
    }
  }

  async createProduct(collectionId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.post(`products/${collectionId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.toastService.addMessage(
        `Product: ${res[0]?.data?.displayName} created`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Product failed to create`,
        ToastTypes.ERROR
      );
    }
  }

  async updateProduct(collectionId, activityType, activityId, productId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`products/${collectionId}/${activityType}/${activityId}/${productId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.toastService.addMessage(
        `Product successfully updated`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Product failed to update`,
        ToastTypes.ERROR
      );
    }
  }

  async deleteProduct(collectionId, activityType, activityId, productId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.delete(`products/${collectionId}/${activityType}/${activityId}/${productId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.toastService.addMessage(
        `Product successfully deleted`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        `${error}`,
        `Product failed to delete`,
        ToastTypes.ERROR
      );
    }
  }
}
