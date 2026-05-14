import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { CollectionService } from '../services/collection.service';

@Injectable({ providedIn: 'root' })
export class CollectionResolver implements Resolve<any> {
  constructor(private collectionService: CollectionService) {}

  async resolve(route: ActivatedRouteSnapshot) {
    const collectionId = route.paramMap.get('collectionId');
    const collection = await this.collectionService.getCollection(collectionId);
    return collection?.items?.[0] ?? collection;
  }
}
