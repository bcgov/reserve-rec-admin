import { Injectable } from '@angular/core';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';
import { ToastService, ToastTypes } from './toast.service';
import { errorMessage } from '../utils/utils';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {

  constructor(
    protected dataService: DataService,
    protected loadingService: LoadingService,
    protected apiService: ApiService,
    protected loggerService: LoggerService,
    protected toastService: ToastService
  ) { }

  async getAllCollections() {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.COLLECTIONS_RESULT);
      const res = (await lastValueFrom(this.apiService.get('collections')))['data'];
      this.dataService.setItemValue(Constants.dataIds.COLLECTIONS_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTIONS_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTIONS_RESULT);
      this.loggerService.error(error);
      throw error;
    }
  }

  async getCollection(collectionId: string) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.COLLECTION_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`collections/${collectionId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.COLLECTION_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.loggerService.error(error);
    }
  }

  async createCollection(props: any) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.COLLECTION_RESULT);
      const res = (await lastValueFrom(this.apiService.post('collections', props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.COLLECTION_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.toastService.addMessage(
        `Collection: ${res?.displayName} created`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.toastService.addMessage(
        errorMessage(error),
        `Collection failed to create`,
        ToastTypes.ERROR
      );
      this.loggerService.error(error);
    }
  }

  async updateCollection(collectionId: string, props: any) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.COLLECTION_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`collections/${collectionId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.COLLECTION_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.toastService.addMessage(
        `Collection successfully updated`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.toastService.addMessage(
        errorMessage(error),
        `Collection failed to update`,
        ToastTypes.ERROR
      );
      this.loggerService.error(error);
    }
  }

  async deleteCollection(collectionId: string) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.COLLECTION_RESULT);
      const res = (await lastValueFrom(this.apiService.delete(`collections/${collectionId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.COLLECTION_RESULT, null);
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.toastService.addMessage(
        `Collection deleted`,
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.COLLECTION_RESULT);
      this.toastService.addMessage(
        errorMessage(error),
        `Collection failed to delete`,
        ToastTypes.ERROR
      );
      this.loggerService.error(error);
    }
  }
}
