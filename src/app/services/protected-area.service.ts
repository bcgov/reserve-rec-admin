import { Injectable } from '@angular/core';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { LoggerService } from './logger.service';
import { ToastService, ToastTypes } from './toast.service';
import { Constants } from '../app.constants';

@Injectable({
  providedIn: 'root',
})
export class ProtectedAreaService {
  constructor(
    private dataService: DataService,
    private toastService: ToastService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService
  ) { }

  protectedAreaConfig = {
    isVisible: { type: 'boolean', required: false },
    adminNotes: { type: 'string', required: false },
    searchTerms: { type: 'string', required: false }
  };

  async getProtectedAreas() {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PROTECTED_AREAS_RESULT);
      const res = await lastValueFrom(this.apiService.get('protected-areas'));
      this.dataService.setItemValue(Constants.dataIds.PROTECTED_AREAS_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PROTECTED_AREAS_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PROTECTED_AREAS_RESULT);
      this.loggerService.error(error);
      throw error; // Re-throw the error for further handling if needed
    }
  }

  async getProtectedAreaByOrcs(orcs: string) {
    try {
      this.dataService.clearItemValue(Constants.dataIds.PROTECTED_AREA_RESULT);
      this.loadingService.addToFetchList(Constants.dataIds.PROTECTED_AREA_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`protected-areas/${orcs}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PROTECTED_AREA_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PROTECTED_AREA_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PROTECTED_AREA_RESULT);
      this.loggerService.error(error);
      throw error; // Re-throw the error for further handling if needed
    }
  }

  async putProtectedArea(obj) {
    let res;
    let errorSubject = '';
    const dataTag = 'protectedAreasPut';
    const sk = obj.orcs
    try {
      errorSubject = 'protectedArea PUT';
      if (this.validateProtectedAreaObject(obj)) {
        this.loadingService.addToFetchList(dataTag);
        this.loggerService.debug(`ProtectedArea PUT ${JSON.stringify(obj)}`);
        res = await firstValueFrom(this.apiService.put(`protected-areas/${sk}`, obj));

        this.toastService.addMessage(
          `ProtectedArea: ${obj.sk} updated.`,
          `ProtectedArea updated`,
          ToastTypes.SUCCESS
        );
      }
    } catch (e) {
      this.loggerService.error(`${JSON.stringify(e)}`);
      this.toastService.addMessage(
        `There was a problem updating the protected areas.`,
        `Error with the ${errorSubject}`,
        ToastTypes.ERROR
      );
    }
    this.loadingService.removeFromFetchList(dataTag);
  }

  validateProtectedAreaObject(obj) {
    // Search terms should be a comma-separated string
    if (obj?.searchTerms) {
      obj.searchTerms = obj.searchTerms.join(',');
    }

    if (!obj || typeof obj !== 'object') {
      this.toastService.addMessage(
        `Invalid protected area object.`,
        `Error validating protected area`,
        ToastTypes.ERROR
      );
      return false;
    }

    // Remove keys not in config
    Object.keys(obj).forEach(key => {
      if (!(key in this.protectedAreaConfig)) {
        delete obj[key];
      }
    });

    // Check the types of the fields
    for (const key in this.protectedAreaConfig) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const expectedType = this.protectedAreaConfig[key].type;
        if (typeof obj[key] !== expectedType) {
          this.toastService.addMessage(
            `Field "${key}" should be of type "${expectedType}", but got "${typeof obj[key]}"`,
            `Error validating protected area`,
            ToastTypes.ERROR
          );
          throw new Error(`Field "${key}" should be of type "${expectedType}", but got "${typeof obj[key]}"`);
        }
      }
    }

    // Remove any reference to pk or sk
    delete obj?.pk;
    delete obj?.name;
    delete obj?.sk;
    delete obj?.orcs;

    return obj;
  }
}

