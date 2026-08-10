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

  private extractErrorMessage(error: any): string {
    return error?.error?.msg || error?.error?.error || error?.error?.message || error?.message || 'Unknown error';
  }

  private buildQueryParams(params: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    });
    return result;
  }

  async getProduct(collectionId, activityType, activityId, productId, fetchActivities = false, fetchGeozones = false, fetchFacilities = false) {
    const queryParams = this.buildQueryParams({
      activityType,
      activityId,
      productId,
      fetchActivities: fetchActivities || undefined,
      fetchGeozones: fetchGeozones || undefined,
      fetchFacilities: fetchFacilities || undefined
    });

    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`products/${collectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        this.extractErrorMessage(error),
        'Product failed to get',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  async getProductsByActivity(collectionId, activityType, activityId) {
    const queryParams = this.buildQueryParams({ activityType, activityId });

    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_LIST);
      const res = (await lastValueFrom(this.apiService.get(`products/${collectionId}`, queryParams)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_LIST, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_LIST);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_LIST);
      this.loggerService.error(error);
      this.toastService.addMessage(
        this.extractErrorMessage(error),
        'Product failed to get',
        ToastTypes.ERROR
      );
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
        this.extractErrorMessage(error),
        'Product failed to create',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  async updateProduct(collectionId, activityType, activityId, productId, props) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.put(`products/${collectionId}/${activityType}/${activityId}/${productId}`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.toastService.addMessage(
        'Product successfully updated',
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        this.extractErrorMessage(error),
        'Product failed to update',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  async deleteProduct(collectionId, activityType, activityId, productId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const res = (await lastValueFrom(this.apiService.delete(`products/${collectionId}/${activityType}/${activityId}/${productId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.PRODUCT_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.toastService.addMessage(
        'Product successfully deleted',
        '',
        ToastTypes.SUCCESS
      );
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        this.extractErrorMessage(error),
        'Product failed to delete',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  async createProductDates(collectionId, activityType, activityId, productId, dateParams: { startDate: string; endDate: string } = { startDate: '', endDate: '' }, showSuccessToast = true) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const queryParams = { startDate: dateParams.startDate, endDate: dateParams.endDate };
      const response = await lastValueFrom(this.apiService.post(`product-dates/${collectionId}/${activityType}/${activityId}/${productId}`, {}, queryParams));
      const res = response['data'];
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      
      if (!res || res.length === 0) {
        return null;
      }
      
      if (showSuccessToast) {
        this.toastService.addMessage(
          'Product dates successfully created',
          '',
          ToastTypes.SUCCESS
        );
      }
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        this.extractErrorMessage(error),
        'Product dates failed to create',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  async createInventoryPools(collectionId, activityType, activityId, productId, startDate, endDate, skipWarnings = false, showSuccessToast = true) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);
      const queryParams = { startDate, endDate, skipWarnings };
      const response = await lastValueFrom(this.apiService.post(`inventory-pools/${collectionId}/${activityType}/${activityId}/${productId}`, {}, queryParams));
      const res = response['data'];
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      
      if (!res || res.length === 0) {
        return null;
      }
      
      if (showSuccessToast) {
        this.toastService.addMessage(
          'Inventory pools successfully created',
          '',
          ToastTypes.SUCCESS
        );
      }
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      this.toastService.addMessage(
        this.extractErrorMessage(error),
        'Inventory pools failed to create',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  async extendProductDateRange(
    collectionId: string,
    activityType: string,
    activityId: string | number,
    productId: string | number,
    product: any,
    newRangeEnd: string,
    startDateForProductDates: string
  ) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);

      // Step 1: Update the product with new date range
      // Only send fields that the backend allows for updates
      const updatePayload = {
        rangeStart: product.rangeStart,
        rangeEnd: newRangeEnd,
        // Include other updatable fields from the product
        ...(product.displayName && { displayName: product.displayName }),
        ...(product.description && { description: product.description }),
        ...(product.timezone && { timezone: product.timezone }),
        ...(product.assetList && { assetList: product.assetList }),
        ...(product.availabilityEstimationPattern && { availabilityEstimationPattern: product.availabilityEstimationPattern }),
        ...(product.reservationPolicy && { reservationPolicy: product.reservationPolicy }),
        ...(product.partyPolicy && { partyPolicy: product.partyPolicy }),
        ...(product.feePolicy && { feePolicy: product.feePolicy }),
        ...(product.changePolicy && { changePolicy: product.changePolicy }),
      };

      const updateRes = await this.updateProduct(collectionId, activityType, activityId, productId, updatePayload);
      
      if (!updateRes) {
        this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
        this.toastService.addMessage(
          'Failed to update product date range',
          'Extension Failed',
          ToastTypes.ERROR
        );
        return null;
      }

      // Step 2: Create ProductDate records for the new date range
      const createRes = await this.createProductDates(
        collectionId,
        activityType,
        activityId,
        productId,
        {
          startDate: startDateForProductDates,
          endDate: newRangeEnd
        },
        false // Don't show success toast yet
      );

      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);

      if (createRes) {
        this.toastService.addMessage(
          `Product date range extended to ${newRangeEnd}. Ready to apply capacity.`,
          'Range Extended Successfully',
          ToastTypes.SUCCESS
        );
        return { product: updateRes, productDates: createRes };
      } else {
        // Product was updated but ProductDates creation failed
        this.toastService.addMessage(
          'Product range updated but ProductDate creation failed. Try loading the calendar again.',
          'Partial Extension',
          ToastTypes.WARNING
        );
        return { product: updateRes, productDates: null };
      }
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      const errorMessage = 
        (error as any)?.error?.msg ||
        (error as any)?.error?.error ||
        (error as any)?.error?.message ||
        (error as any)?.message ||
        'Unknown error';
      this.toastService.addMessage(
        errorMessage,
        'Failed to extend product date range',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  /**
   * Lightweight range extension for manual date edits
   * Just updates rangeEnd without creating ProductDates for entire range
   * ProductDates will be created on-demand via ensureInventoryPoolExists
   */
  async updateProductRangeEnd(
    collectionId: string,
    activityType: string,
    activityId: string | number,
    productId: string | number,
    product: any,
    newRangeEnd: string
  ) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.PRODUCT_RESULT);

      const updatePayload = {
        rangeStart: product.rangeStart,
        rangeEnd: newRangeEnd,
        ...(product.displayName && { displayName: product.displayName }),
        ...(product.description && { description: product.description }),
        ...(product.timezone && { timezone: product.timezone }),
        ...(product.assetList && { assetList: product.assetList }),
        ...(product.availabilityEstimationPattern && { availabilityEstimationPattern: product.availabilityEstimationPattern }),
        ...(product.reservationPolicy && { reservationPolicy: product.reservationPolicy }),
        ...(product.partyPolicy && { partyPolicy: product.partyPolicy }),
        ...(product.feePolicy && { feePolicy: product.feePolicy }),
        ...(product.changePolicy && { changePolicy: product.changePolicy }),
      };

      const updateRes = await this.updateProduct(collectionId, activityType, activityId, productId, updatePayload);
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      return updateRes;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.PRODUCT_RESULT);
      this.loggerService.error(error);
      const errorMessage = 
        (error as any)?.error?.msg ||
        (error as any)?.error?.error ||
        (error as any)?.error?.message ||
        (error as any)?.message ||
        'Unknown error';
      this.toastService.addMessage(
        errorMessage,
        'Failed to extend product date range',
        ToastTypes.ERROR
      );
      return null;
    }
  }
}
