import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { FacilityService } from '../services/facility.service';

@Injectable({ providedIn: 'root' })
export class FacilityResolver implements Resolve<any> {
  constructor(private facilityService: FacilityService) { }

  async resolve(route: ActivatedRouteSnapshot) {
    const fcCollectionId = route.paramMap.get('fcCollectionId');
    const facilityType = route.paramMap.get('facilityType');
    const facilityId = route.paramMap.get('facilityId');
    const facility = await this.facilityService.getFacility(fcCollectionId, facilityType, facilityId, true);
    return facility?.items?.[0] || facility;
  }
}