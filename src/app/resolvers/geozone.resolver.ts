import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { GeozoneService } from '../services/geozone.service';

@Injectable({ providedIn: 'root' })
export class GeozoneResolver implements Resolve<any> {
  constructor(private geozoneService: GeozoneService) {}

  async resolve(route: ActivatedRouteSnapshot) {
    const collectionId = route.paramMap.get('collectionId');
    const geozoneId = route.paramMap.get('geozoneId');
    const geozone = await this.geozoneService.getGeozone(collectionId, geozoneId);
    return geozone?.items?.[0];
  }
}
