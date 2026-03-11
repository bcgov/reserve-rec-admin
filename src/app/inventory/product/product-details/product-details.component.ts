import { ChangeDetectorRef, Component, signal, ViewChild, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { PolicyListItemComponent } from '../../policy/policy-list-item/policy-list-item.component';
import { ActivityService } from '../../../services/activity.service';
import { PolicyService } from '../../../services/policy.service';

@Component({
  selector: 'app-product-details',
  imports: [DatePipe, CommonModule, ActivityListItemComponent, PolicyListItemComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss'
})
export class ProductDetailsComponent {
  public product;
  public _markers: WritableSignal<any[]> = signal([]);
  public markerOptions = {
    color: '#003366',
  };

  public relatedActivity: any[] = [];
  public relatedPolicies: any[] = [];
  public loadingRelationships: boolean = false;

  constructor(
    protected router: Router,
    private sanitizer: DomSanitizer,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    private activityService: ActivityService,
    private policyService: PolicyService
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe(async (data) => {
      if (data?.['product']) {
        this.product = data['product'];
        await this.loadRelationships();
      }
    });
  }

  get safeAgreements(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.product?.agreements || '');
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }



  // updateMarkers() {
  //   if (this.product?.location?.coordinates) {
  //     const coordinates = this.product.location.coordinates;
  //     if (coordinates && coordinates?.length === 2) {
  //       this._markers.set([{
  //         coordinates: [coordinates[0], coordinates[1]],
  //         options: this.markerOptions
  //       }]);
  //     }
  //     this.mapComponent?.flyToFitBounds(
  //       [{coordinates: coordinates}],);
  //   }
  // }

  /**
   * Load relationships for the current product
   * Fetches activity and geozone relationships from the relationships endpoint
   */
  async loadRelationships() {
    if (!this.product?.pk || !this.product?.sk) {
      console.warn('Cannot load relationships: Product missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      // Fetch activity relationships
      await this.loadActivityRelationship();
      await this.loadPolicyRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }

  /**
   * Load and fetch activity entities that are tied to this product
   */
  async loadActivityRelationship() {
    try {
      const activity = await this.activityService.getActivity(this.product.collectionId, this.product.activityType, this.product.activityId);

      if (activity) {
        console.log(`Found ${activity.length} activity`);
        this.relatedActivity = activity;
      } else {
        console.log('No activity found');
        this.relatedActivity = null;
      }

    } catch (error) {
      console.error('Error loading activities relationships:', error);
      this.relatedActivity = null;
    }
  }

  // Load and fetch policies - uses the product pk and sk to fetch policies related to the product from the policies endpoint
  async loadPolicyRelationships() {
    try {
      const productPolicies = await this.policyService.getPoliciesByProduct(this.product.pk, this.product.sk)

      if (productPolicies?.length > 0) {
        console.log(`Found ${productPolicies.length} policies`);
        this.relatedPolicies = productPolicies;
      } else {
        console.log('No policies relationships found');
        this.relatedPolicies = [];
      }
    } catch (error) {
      console.error('Error loading policies relationships:', error);
      this.relatedPolicies = [];
    }
  }

  /**
   * Load and fetch geozone entities that are related to this activity
   */
  // async loadGeozoneRelationships() {
  //   try {
  //     // Get geozone relationships for this activity with entity data expanded
  //     const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
  //       this.product.pk,
  //       this.product.sk,
  //       'geozone', // target schema filter
  //       true, // expand entities
  //       true  // bidirectional
  //     );

  //     if (relationshipsResponse?.length > 0) {
  //       console.log(`Found ${relationshipsResponse.length} geozone relationships`);
        
  //       // Extract the entity data directly from expanded relationships
  //       this.relatedGeozones = relationshipsResponse
  //         .map((rel: any) => rel.entity)
  //         .filter((entity: any) => entity !== null);
        
  //       console.log(`Loaded ${this.relatedGeozones.length} geozones`);
  //     } else {
  //       console.log('No geozone relationships found');
  //       this.relatedGeozones = [];
  //     }
  //   } catch (error) {
  //     console.error('Error loading geozone relationships:', error);
  //     this.relatedGeozones = [];
  //   }
  // }

}
