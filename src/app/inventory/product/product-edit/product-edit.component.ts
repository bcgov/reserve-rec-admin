import { ChangeDetectorRef, Component } from '@angular/core';
import { ProductFormComponent } from '../product-form/product-form.component';
import { ProductService } from '../../../services/product.service';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-product-edit',
  imports: [ProductFormComponent],
  templateUrl: './product-edit.component.html',
  styleUrl: './product-edit.component.scss'
})
export class ProductEditComponent {
  public productForm;
  public product;

  // Track initial state for relationship diffing
  public initialActivities: any[] = [];

  // Current state (updated as user edits)
  public existingActivities: any[] = [];

  constructor(
    protected productService: ProductService,
    protected relationshipService: RelationshipService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cdr: ChangeDetectorRef
  ) {
    if (this.route.parent?.snapshot.data['product']) {
      this.product = this.route.parent?.snapshot.data['product'];
    }
  }

  updateProductForm(event) {
    this.productForm = event;
  }


  // Called by child component when relationships are initially loaded
  // Captures the initial state for diffing later
  onRelationshipsLoaded(type: string, relationships: any[]) {
    this.initialActivities = [...relationships];
    this.existingActivities = [...relationships];
  }


  // Called when relationships change (user adds/removes entities)
  // Updates the current state for diffing
  onRelationshipsChanged(type: string, relationships: any[]) {
    this.existingActivities = [...relationships];
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


  // Sync relationship changes with the backend
  // Compares initial state vs current state and creates/deletes as needed
  async synchronize() {
    if (!this.product?.pk || !this.product?.sk) {
      console.warn('Cannot sync relationships: product missing pk or sk');
      return;
    }

    const sourceEntity = {
      schema: 'product',
      pk: this.product.pk,
      sk: this.product.sk
    };

    try {
      // Sync activity relationships
      await this.relationshipService.syncRelationships(
        sourceEntity,
        this.initialActivities,
        this.existingActivities
      );
      console.log('Activity relationships synced successfully');
    } catch (error) {
      console.error('Error syncing relationships:', error);
      throw error;
    }
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

    if (props?.['location']) {
      const location = this.productForm?.get('location').value;
      props['location'] = {
        type: 'point',
        coordinates: [location.longitude, location.latitude]
      };
    };

    // Handle search terms
    props['searchTerms'] = this.productForm.get('searchTerms')?.value || [];

    // Delete relationship form values
    delete props['activities'];

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
