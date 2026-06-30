import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { ApiService } from './api.service';
import { LoadingService } from './loading.service';
import { ToastService, ToastTypes } from './toast.service';
import { errorMessage } from '../utils/utils';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(
    private dataService: DataService,
    private loggerService: LoggerService,
    private apiService: ApiService,
    private loadingService: LoadingService,
    protected toastService: ToastService,
    private authService: AuthService
  ) { }

  async searchByQuery(query: string, terms: any = null, filters: any = null, passiveSearch: boolean = false) {
    // Don't run searches when there's no authenticated user. During logout the
    // Cognito identity is torn down and an in-flight/re-fired search 403s with
    // an IAM "explicit deny", which surfaced a "Search error" toast as the user
    // signed out (#269).
    if (!this.authService.user()) {
      return null;
    }
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
      // Suppress the toast if the user signed out mid-request — the search
      // 403s as the session tears down (#269).
      if (this.authService.user()) {
        this.toastService.addMessage(
          errorMessage(error),
          `Search error`,
          ToastTypes.ERROR
        );
      }
      this.loadingService.removeFromFetchList(Constants.dataIds.SEARCH_RESULTS);
      this.loggerService.error(error);
      return null; // Return null or handle the error as needed
    }
  }

  /**
   * Performs an autocomplete/suggest search for typeahead functionality.
   * @param query The text to get suggestions for
   * @param options Additional options like field, size, fuzziness, and filters
   * @returns Array of suggestion objects with text and source data
   */
  async getSuggestions(query: string, options: any = {}) {

    const body = {
      text: query,
      suggest: true,
      suggestField: options.field || 'searchTerms.suggest',
      suggestSize: options.size || 10,
      fuzzy: options.fuzzy || true,
      fuzziness: options.fuzziness || 'AUTO',
      ...options.filters || {} // Spread filter fields at top level
    };

    try {
      const res: any[] = (await lastValueFrom(this.apiService.post(`search`, body)))['data'];
      return res; // Returns array of suggestion objects
    } catch (error) {
      this.loggerService.error(error);
      return [];
    }
  }

  clearSearchResults() {
    this.dataService.setItemValue(Constants.dataIds.SEARCH_RESULTS, []);
  }
}
