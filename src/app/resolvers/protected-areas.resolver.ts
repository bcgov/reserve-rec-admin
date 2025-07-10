import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { ProtectedAreaService } from '../services/protected-area.service';

@Injectable({ providedIn: 'root' })
export class ProtectedAreasResolver implements Resolve<any> {
  constructor(private ProtectedAreaService: ProtectedAreaService) {}

  resolve(route: ActivatedRouteSnapshot) {
    const orcs = route.paramMap.get('orcs');
    const protectedAreas = this.ProtectedAreaService.getProtectedAreaByOrcs(orcs); // Replace with actual global ID
    return protectedAreas; // Assuming getProtectedAreasByOrcs returns an observable
  }
}
