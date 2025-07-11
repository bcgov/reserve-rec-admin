import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { GeozoneService } from '../services/geozone.service';

@Injectable({ providedIn: 'root' })
export class GeozoneResolver implements Resolve<any> {
  constructor(private geozoneService: GeozoneService) {}

  async resolve(route: ActivatedRouteSnapshot) {
    const gzCollectionId = route.paramMap.get('gzCollectionId');
    const geozoneId = route.paramMap.get('geozoneId');
    const geozone = await this.geozoneService.getGeozone(gzCollectionId, geozoneId);
    return geozone?.items?.[0];
  }
}