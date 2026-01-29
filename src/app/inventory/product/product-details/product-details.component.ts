import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Constants } from '../../../app.constants';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, DatePipe, ActivityListItemComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
  providers: [BsModalService]
})
export class ProductDetailsComponent {
  public product: any = null;
  public location: any = null;
  public envelope: any = null;
  public _markers: WritableSignal<any[]> = signal([]);
  public _envelope: WritableSignal<any[]> = signal([]);
  public markerOptions = {
    color: 'goldenrod',
  };
  public envelopeOptions = {
    fillColor: 'goldenrod',
    fillOpacity: 0.5,
  };

  // Relationship data
  public relatedActivities: any[] = [];
  public loadingRelationships: boolean = false;

  constructor(
    private relationshipService: RelationshipService,
    private route: ActivatedRoute,
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe(async (data) => {
      if (data?.['product']) {
        this.product = data['product'];
        await this.loadRelationships();
      }
    });
  }

  getActivityTypeOption() {
    return Constants.activityTypes[this.product?.activityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getActivitySubTypeOption() {
    return Constants.activityTypes[this.product?.activityType]?.subTypes?.[this.product?.activitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  // Load relationships for the current product
  // Fetches facility and geozone relationships from the relationships endpoint
  async loadRelationships() {
    if (!this.product?.pk || !this.product?.sk) {
      console.warn('Cannot load relationships: Activity missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      // Fetch geozone relationships
      await this.loadActivityRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }


  // Load and fetch activities entities that are related to this product
  async loadActivityRelationships() {
    try {
      // Get activities relationships for this product with entity data expanded
      // bidirectional=true will include both:
      // 1. Activities that the product is linked TO (forward)
      // 2. Activities that are linked to the product (reverse via GSI)
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.product.pk,
        this.product.sk,
        'activity', // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        console.log(`Found ${relationshipsResponse.length} activities relationships`);

        // Extract the entity data directly from expanded relationships
        this.relatedActivities = relationshipsResponse
          .map((rel: any) => rel.entity)
          .filter((entity: any) => entity !== null);

      } else {
        console.log('No activities relationships found');
        this.relatedActivities = [];
      }
    } catch (error) {
      console.error('Error loading activities relationships:', error);
      this.relatedActivities = [];
    }
  }
}
