import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { ProtectedAreaService } from '../services/protected-area.service';

@Injectable({ providedIn: 'root' })
export class ProtectedAreasResolver implements Resolve<any> {
  constructor(private ProtectedAreaService: ProtectedAreaService) {}

  resolve(route: ActivatedRouteSnapshot) {
    return this.ProtectedAreaService.getProtectedAreas();
  }
}
