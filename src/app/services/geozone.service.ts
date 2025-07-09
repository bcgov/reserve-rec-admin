import { Injectable } from '@angular/core';
import { Constants } from '../app.constants';
import { lastValueFrom } from 'rxjs';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class GeozoneService {

  constructor(
    protected dataService: DataService,
    protected loadingService: LoadingService,
    protected apiService: ApiService,
    protected loggerService: LoggerService
  ) { }

  async getGeozone(gzCollectionId, geozoneId) {
    try {
      this.loadingService.addToFetchList(Constants.dataIds.GEOZONE_RESULT);
      const res = (await lastValueFrom(this.apiService.get(`geozones/${gzCollectionId}/${geozoneId}`)))['data'];
      this.dataService.setItemValue(Constants.dataIds.GEOZONE_RESULT, res);
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds.GEOZONE_RESULT);
      this.loggerService.error(error);
    }
  }
}
