import { AfterViewChecked, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductService } from '../../../services/product.service';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityEditBaseComponent } from '../../../shared/components/entity/entity-base/entity-edit-base.component';

@Component({
  selector: 'app-product-edit',
  imports: [ProductFormComponent],
  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent extends EntityEditBaseComponent implements AfterViewChecked {
  @ViewChild(ProductFormComponent) productFormComponent!: ProductFormComponent;

  public productForm;
  public product;

  constructor(
    protected productService: ProductService,
    relationshipService: RelationshipService,
    router: Router,
    route: ActivatedRoute,
    cdr: ChangeDetectorRef
  ) {
    super(relationshipService, router, route, cdr);
    if (this.route.parent?.snapshot.data['product']) {
      this.product = this.route.parent?.snapshot.data['product'];
    }
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
  }

  updateProductForm(event) {
    this.productForm = event;
  }

  async submit() {
    const collectionId = this.product?.collectionId;
    const activityType = this.product?.activityType;
    const activityId = this.product?.activityId;
    const productId = this.product?.productId;

    if (!collectionId || !activityType || !activityId || !productId) {
      console.error('Missing required identifiers for product update');
      return;
    }

    const props = this.formatFormForSubmission();

    // Step 1: Update the product entity itself
    const res = await this.productService.updateProduct(collectionId, activityType, activityId, productId, props);

    if (res) {
      // Step 2: Sync relationships (handles additions and deletions)
      await this.synchronize();

      // Step 3: Navigate to the updated product
      this.navigateToProduct(collectionId, activityType, activityId, productId);
    }
  }

  async synchronize() {
    if (!this.product?.pk || !this.product?.sk) {
      console.warn('Cannot sync relationships: product missing pk or sk');
      return;
    }
    await this.synchronizeAll({ schema: 'product', pk: this.product.pk, sk: this.product.sk });
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const props = Object.entries(this.productForm.controls).map(([key, control]) => {
      if (control['dirty']) {
        return {
          [key]: control['value']
        }
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});

    // Handle search terms
    props['searchTerms'] = this.productForm.get('searchTerms')?.value || [];

    for (const policy of ['reservationPolicy', 'partyPolicy', 'feePolicy', 'changePolicy']) {
      if (props[policy]) {
        props[policy] = {
          pk: props[policy]?.['pk'],
          sk: props[policy]?.['sk']
        };
      }
    }

    delete props['activity'];
    delete props['policies'];
    delete props['collectionId'];
    delete props['meta'];
    return props;
  }

  resetForm() {
    this.productFormComponent.resetToProduct(this.product);
    for (const [type, items] of this.initialRelationships) {
      this.currentRelationships.set(type, [...items]);
    }
  }

  cancel() {
    const collectionId = this.product?.collectionId;
    const activityType = this.product?.activityType;
    const activityId = this.product?.activityId;
    const productId = this.product?.productId;
    this.navigateToProduct(collectionId, activityType, activityId, productId);
  }

  navigateToProduct(collectionId, activityType, activityId, productId) {
    this.router.navigate([`/inventory/product/${collectionId}/${activityType}/${activityId}/${productId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges(); // prevent weird duplicate stacking on details page
    });
  }
}
