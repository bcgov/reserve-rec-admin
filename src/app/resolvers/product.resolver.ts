import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { ProductService } from '../services/product.service';

@Injectable({ providedIn: 'root' })
export class ProductResolver implements Resolve<any> {
  constructor(private productService: ProductService) {}

  resolve(route: ActivatedRouteSnapshot) {
    // Check current route first, then parent route for parameters
    const collectionId = route.paramMap.get('collectionId') || route.parent?.paramMap.get('collectionId');
    const activityType = route.paramMap.get('activityType') || route.parent?.paramMap.get('activityType');
    const activityId = route.paramMap.get('activityId') || route.parent?.paramMap.get('activityId');
    const productId = route.paramMap.get('productId') || route.parent?.paramMap.get('productId');
    const product = this.productService.getProduct(collectionId, activityType, activityId, productId, true);
    return product;
  }
}
