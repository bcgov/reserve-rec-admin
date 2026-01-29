import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductFormComponent } from '../../product/product-form/product-form.component';

@Component({
  selector: 'app-product-create',
  imports: [ProductFormComponent],
  templateUrl: './product-create.component.html',
  styleUrl: './product-create.component.scss'
})
export class ProductCreateComponent {
  public productForm: UntypedFormGroup;
  public product;

  constructor(
    protected productService: ProductService,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute
  ) {
    if (this.route.parent?.snapshot.data['product']) {
      this.product = this.route.parent?.snapshot.data['product'];
    }
  }

  updateProductForm(event) {
    this.productForm = event;
  }

  onRelationshipsChanged(type: string, relationships: any[]) {
    console.log(`Relationships changed for ${type}:`, relationships);
    // Update form controls directly - the form already tracks these
    this.productForm?.get('activities')?.setValue(relationships);
    this.productForm?.get('activities')?.markAsDirty();
  }

  async submit() {
    // Check form validity first
    if (!this.productForm || this.productForm.invalid) {
      console.error('Form is invalid. Please correct errors before submitting.');
      this.productForm?.markAllAsTouched();
      return;
    }

    const collectionId = this.productForm.get('collectionId').value || this.product?.collectionId;
    const activityType = this.productForm.get('activityType').value || this.product?.activityType;
    const activityId = this.productForm.get('activityId').value || this.product?.activityId;

    if (!collectionId || !activityType || !activityId) {
      console.error('Missing required collection ID, activity type, and/or activity ID');
      return;
    }

    const props = this.formatFormForSubmission();
    
    const res = await this.productService.createProduct(collectionId, props);

    const productId = res[0]?.data?.productId;
    if (productId) {
      this.navigateToProduct(collectionId, activityType, activityId, productId);
    }
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const props = Object.entries(this.productForm.controls).map(([key, control]) => {
      if (control['dirty']) {
        return {
          [key]: control['value']
        };
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});
   
    delete props['policies']; // TODO: we are temporarily removing policies from the props
    delete props['collectionId']; // Remove collectionId from the props
    delete props['meta']; // Remove meta fields from the props
    return props;
  }

  navigateToProduct(collectionId, activityType, activityId, productId) {
    this.router.navigate([`/inventory/product/${collectionId}/${activityType}/${activityId}/${productId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
      window.location.reload();
    });
  }

}
