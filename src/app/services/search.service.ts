import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { ApiService } from './api.service';
import { LoadingService } from './loading.service';
import { ToastService, ToastTypes } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(
    private dataService: DataService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService,
    protected toastService: ToastService
  ) { }

  async searchByQuery(query: string, terms: any = null, filters: any = null, passiveSearch: boolean = false) {
    const body = {
      text: query,
      ...terms
    };
    try {
      // if passiveSearch, we do not call loadingService and the results are stored under a
      // different dataId. This enables the search to be used in a passive way. Instead of
      // waiting for the search to complete, the results are updated in the background and
      // shown when available.
      if (!passiveSearch) {
        this.clearSearchResults();
        this.loadingService.addToFetchList(Constants.dataIds.SEARCH_RESULTS);
      }
      console.log('search');
      const res: any[] = (await lastValueFrom(this.apiService.post(`search`, body, filters)))['data']['hits'];
      if (!passiveSearch) {
        this.dataService.setItemValue(Constants.dataIds.SEARCH_RESULTS, res);
      } else {
        this.dataService.setItemValue(Constants.dataIds.PASSIVE_SEARCH_RESULTS, res);
      }
      this.loadingService.removeFromFetchList(Constants.dataIds.SEARCH_RESULTS);
      return res; // Return the results for further processing if needed
    } catch (error) {
      this.toastService.addMessage(
        `${error}`,
        `Search error`,
        ToastTypes.ERROR
      );
      this.loadingService.removeFromFetchList(Constants.dataIds.SEARCH_RESULTS);
      this.loggerService.error(error);
      return null; // Return null or handle the error as needed
    }
  }

  getDocument

  clearSearchResults() {
    this.dataService.setItemValue(Constants.dataIds.SEARCH_RESULTS, []);
  }
}
