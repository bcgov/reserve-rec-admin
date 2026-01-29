import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, signal, WritableSignal } from '@angular/core';
import { GeozoneService } from '../../../services/geozone.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationModalComponent, ModalRowSpec } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Constants } from '../../../app.constants';
import { RelationshipService } from '../../../services/relationship.service';
import { FacilityListItemComponent } from '../../facility/facility-list-item/facility-list-item.component';
import { GeozoneListItemComponent } from '../../geozone/geozone-list-item/geozone-list-item.component';
import { ProductListItemComponent } from '../../product/product-list-item/product-list-item.component';

@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, DatePipe, FacilityListItemComponent],
  templateUrl: './activity-details.component.html',
  styleUrl: './activity-details.component.scss',
  providers: [BsModalService]
})
export class ActivityDetailsComponent {
  public activity: any = null;
  public facility: any = null;
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
  public relatedFacilities: any[] = [];
  public relatedGeozones: any[] = [];
  public relatedProducts: any[] = [];
  public loadingRelationships: boolean = false;

  constructor(
    private relationshipService: RelationshipService,
    private route: ActivatedRoute,
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe(async (data) => {
      if (data?.['activity']) {
        this.activity = data['activity'];
        await this.loadRelationships();
      }
    });
  }

  getActivityTypeOption() {
    return Constants.activityTypes[this.activity?.activityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getActivitySubTypeOption() {
    return Constants.activityTypes[this.activity?.activityType]?.subTypes?.[this.activity?.activitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  updateMarkers() {
    if (this.location?.coordinates) {
      const coordinates = this.location.coordinates;
      if (coordinates && coordinates.length === 2) {
        this._markers.set([{
          coordinates: [coordinates[0], coordinates[1]],
          options: this.markerOptions
        }]);
      }
    }
  }

  updateEnvelope() {
    if (this.envelope?.coordinates) {
      const coordinates = this.envelope.coordinates;
      if (coordinates && coordinates.length === 2) {
        this._envelope.set([{
          coordinates: [
            [coordinates[0][0], coordinates[0][1]],
            [coordinates[0][0], coordinates[1][1]],
            [coordinates[1][0], coordinates[1][1]],
            [coordinates[1][0], coordinates[0][1]],
            [coordinates[0][0], coordinates[0][1]] // Closing the polygon
          ],
          options: this.envelopeOptions
        }]);
      }
    }
  }

  // Load relationships for the current activity
  // Fetches facility and geozone relationships from the relationships endpoint
  async loadRelationships() {
    if (!this.activity?.pk || !this.activity?.sk) {
      console.warn('Cannot load relationships: Activity missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      // Fetch facility relationships
      await this.loadFacilityRelationships();

      // Fetch geozone relationships
      await this.loadGeozoneRelationships();

      // Fetch product relationships
      await this.loadProductRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }

  // Load and fetch facility entities that are related to this activity
  async loadFacilityRelationships() {
    try {
      // Get facility relationships for this activity with entity data expanded
      // bidirectional=true will include both:
      // 1. Facilities that the activity is linked TO (forward)
      // 2. Facilities that are linked to the activity (reverse via GSI)
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.activity.pk,
        this.activity.sk,
        'facility', // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        console.log(`Found ${relationshipsResponse.length} facility relationships`);

        // Extract the entity data directly from expanded relationships
        this.relatedFacilities = relationshipsResponse
          .map((rel: any) => rel.entity)
          .filter((entity: any) => entity !== null);

      } else {
        console.log('No facility relationships found');
        this.relatedFacilities = [];
      }
    } catch (error) {
      console.error('Error loading facility relationships:', error);
      this.relatedFacilities = [];
    }
  }

  // Load and fetch geozone entities that are related to this activity
  async loadGeozoneRelationships() {
    try {
      // Get geozone relationships for this activity with entity data expanded
      // bidirectional=true will include both forward and reverse relationships
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.activity.pk,
        this.activity.sk,
        'geozone', // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        console.log(`Found ${relationshipsResponse.length} geozone relationships`);

        // Extract the entity data directly from expanded relationships
        this.relatedGeozones = relationshipsResponse
          .map((rel: any) => rel.entity)
          .filter((entity: any) => entity !== null);

      } else {
        console.log('No geozone relationships found');
        this.relatedGeozones = [];
      }
    } catch (error) {
      console.error('Error loading geozone relationships:', error);
      this.relatedGeozones = [];
    }
  }

  // Load and fetch product entities that are related to this activity
  async loadProductRelationships() {
    try {
      // Get product relationships for this activity with entity data expanded
      // bidirectional=true will include both forward and reverse relationships
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.activity.pk,
        this.activity.sk,
        'product', // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        console.log(`Found ${relationshipsResponse.length} product relationships`);

        // Extract the entity data directly from expanded relationships
        this.relatedProducts = relationshipsResponse
          .map((rel: any) => rel.entity)
          .filter((entity: any) => entity !== null);

      } else {
        console.log('No product relationships found');
        this.relatedProducts = [];
      }
    } catch (error) {
      console.error('Error loading product relationships:', error);
      this.relatedProducts = [];
    }
  }
}
