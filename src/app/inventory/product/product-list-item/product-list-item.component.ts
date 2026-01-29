import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-list-item',
  imports: [CommonModule],
  templateUrl: './product-list-item.component.html',
  styleUrl: './product-list-item.component.scss'
})
export class ProductListItemComponent {
  @Input() product: any;
  @Input() showDetailsButton: boolean = true;

  public constantsData = null;

  navigateToProduct(product: any) {
    const productUrl = `/inventory/product/${product.collectionId}/${product.activityType}/${product.activityId}/${product.productId}`;
    window.open(productUrl, '_blank');
  }

}
