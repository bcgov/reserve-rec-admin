import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { ProtectedAreaService } from '../services/protected-area.service';

@Injectable({ providedIn: 'root' })
export class ProtectedAreaResolver implements Resolve<any> {
  constructor(private ProtectedAreaService: ProtectedAreaService) {}

  resolve(route: ActivatedRouteSnapshot) {
    const orcs = route.paramMap.get('orcs');
    const protectedArea = this.ProtectedAreaService.getProtectedAreaByOrcs(orcs);
    return protectedArea; // Assuming getProtectedAreasByOrcs returns an observable
  }
}
