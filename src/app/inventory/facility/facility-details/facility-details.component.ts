import { AfterViewInit, ChangeDetectorRef, Component, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Constants } from '../../../app.constants';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { GeozoneListItemComponent } from '../../geozone/geozone-list-item/geozone-list-item.component';
import { RelationshipService } from '../../../services/relationship.service';

@Component({
  selector: 'app-facility-details',
  imports: [UpperCasePipe, MapComponent, DatePipe, CommonModule, ActivityListItemComponent, GeozoneListItemComponent],
  templateUrl: './facility-details.component.html',
  styleUrl: './facility-details.component.scss'
})
export class FacilityDetailsComponent implements AfterViewInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  public facility;
  public _markers: WritableSignal<any[]> = signal([]);
  public markerOptions = {
    color: '#003366',
  };

  // Relationship data
  public relatedActivities: any[] = [];
  public relatedGeozones: any[] = [];
  public loadingRelationships: boolean = false;

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    private relationshipService: RelationshipService,
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe(async (data) => {
      if (data?.['facility']) {
        this.facility = data['facility'];
        await this.loadRelationships();
      }
    });
  }

  getFacilityTypeOption() {
    return Constants.facilityTypes[this.facility?.facilityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getFacilitySubTypeOption() {
    return Constants.facilityTypes[this.facility?.facilityType]?.subTypes?.[this.facility?.facilitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  ngAfterViewInit(): void {
    // Ensure the map is updated after the view has initialized
    this.updateMarkers();
  }

  updateMarkers() {
    if (this.facility?.location?.coordinates) {
      const coordinates = this.facility.location.coordinates;
      if (coordinates && coordinates.length === 2) {
        this._markers.set([{
          coordinates: [coordinates[0], coordinates[1]],
          options: this.markerOptions
        }]);
      }
      this.mapComponent?.flyToFitBounds(
        [{coordinates: coordinates}],);
    }
  }

  /**
   * Load relationships for the current facility
   * Fetches activity and geozone relationships from the relationships endpoint
   */
  async loadRelationships() {
    if (!this.facility?.pk || !this.facility?.sk) {
      console.warn('Cannot load relationships: Facility missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      // Fetch activity relationships
      await this.loadActivityRelationships();
      
      // Fetch geozone relationships
      await this.loadGeozoneRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }

  /**
   * Load and fetch activity entities that are related to this facility
   */
  async loadActivityRelationships() {
    try {
      // Get activity relationships for this facility with entity data expanded
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.facility.pk,
        this.facility.sk,
        'activity', // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        console.log(`Found ${relationshipsResponse.length} activity relationships`);
        
        // Extract the entity data directly from expanded relationships
        this.relatedActivities = relationshipsResponse
          .map((rel: any) => rel.entity)
          .filter((entity: any) => entity !== null);
        
        console.log(`Loaded ${this.relatedActivities.length} activities`);
      } else {
        console.log('No activity relationships found');
        this.relatedActivities = [];
      }
    } catch (error) {
      console.error('Error loading activity relationships:', error);
      this.relatedActivities = [];
    }
  }

  /**
   * Load and fetch geozone entities that are related to this activity
   */
  async loadGeozoneRelationships() {
    try {
      // Get geozone relationships for this activity with entity data expanded
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.facility.pk,
        this.facility.sk,
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
        
        console.log(`Loaded ${this.relatedGeozones.length} geozones`);
      } else {
        console.log('No geozone relationships found');
        this.relatedGeozones = [];
      }
    } catch (error) {
      console.error('Error loading geozone relationships:', error);
      this.relatedGeozones = [];
    }
  }

}
