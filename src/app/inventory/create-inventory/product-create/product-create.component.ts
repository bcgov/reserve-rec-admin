import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductFormComponent } from '../../product/product-form/product-form.component';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';

@Component({
  selector: 'app-product-create',
  imports: [ProductFormComponent, LoadalComponent],
  templateUrl: './product-create.component.html',
  styleUrl: './product-create.component.scss'
})
export class ProductCreateComponent {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;

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
    this.productForm?.get(type)?.setValue(relationships);
    this.productForm?.get(type)?.markAsDirty();
  }

  async submit() {
    this.loadal.show();
    // Check form validity first
    if (!this.productForm || this.productForm.invalid) {
      const invalidControls = Object.entries(this.productForm?.controls ?? {})
        .filter(([, control]) => control.invalid)
        .map(([key, control]) => ({ key, errors: control.errors, value: control.value }));
      console.error('Form is invalid. Please correct errors before submitting.', this.productForm?.errors, invalidControls);
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

    this.loadal.show();
    try {
      const props = this.formatFormForSubmission();
      const res = await this.productService.createProduct(collectionId, props);
      const productId = res?.[0]?.data?.productId;
      if (productId) {
        this.navigateToProduct(collectionId, activityType, activityId, productId);
      }
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      this.loadal.hide();
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

    for (const policy of ['reservationPolicy', 'partyPolicy', 'feePolicy', 'changePolicy']) {
      if (props[policy]) {
        props[policy] = {
          pk: props[policy]?.['pk'],
          sk: props[policy]?.['sk']
        };
      } else {
        delete props[policy]; // Remove any policies that are not set
      }
    }
   
    delete props['activity']; // Remove the activity
    delete props['policies']; // Remove the policies
    delete props['collectionId']; // Remove collectionId from the props
    delete props['meta']; // Remove meta fields from the props
    return props;
  }

  navigateToProduct(collectionId, activityType, activityId, productId) {
    this.router.navigate([`/inventory/product/${collectionId}/${activityType}/${activityId}/${productId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
    });
  }

}
