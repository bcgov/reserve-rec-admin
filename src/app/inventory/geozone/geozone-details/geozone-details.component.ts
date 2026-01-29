import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Input, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { GeozoneEditComponent } from '../geozone-edit/geozone-edit.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalRowSpec } from '../../../shared/components/search-terms/search-terms.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { GeozoneService } from '../../../services/geozone.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { FacilityListItemComponent } from '../../facility/facility-list-item/facility-list-item.component';

@Component({
  selector: 'app-geozone-details',
  imports: [CommonModule, UpperCasePipe, DatePipe, MapComponent, FacilityListItemComponent, ActivityListItemComponent],
  templateUrl: './geozone-details.component.html',
  styleUrl: './geozone-details.component.scss',
  providers: [BsModalService]
})
export class GeozoneDetailsComponent implements AfterViewInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;

  public geozone;
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
  public relatedActivities: any[] = [];
  public loadingRelationships: boolean = false;

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    protected geozoneService: GeozoneService,
    protected modalService: BsModalService,
    private relationshipService: RelationshipService,
  ) {
    if (this.route.snapshot.data['geozone']) {
      this.route.data.subscribe(async (data) => {
      if (data?.['geozone']) {
        this.geozone = data['geozone'];
        await this.loadRelationships();
      }
    });
    }
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  ngAfterViewInit(): void {
    // Ensure the map is updated after the view has initialized
    this.updateMarkers();
    this.updateEnvelope();
  }

  updateMarkers() {
    if (this.geozone?.location?.coordinates) {
      const coordinates = this.geozone.location.coordinates;
      if (coordinates && coordinates.length === 2) {
        this._markers.set([{
          coordinates: [coordinates[0], coordinates[1]],
          options: this.markerOptions
        }]);
      }
      if (this._envelope()?.[0]?.coordinates?.length > 1) {
        this.mapComponent?.map?.fitBounds([
          this._envelope()[0].coordinates[0],
          this._envelope()[0].coordinates[2]
        ], { padding: 75 });
      }
    }
  }

  updateEnvelope() {
    if (this.geozone?.envelope?.coordinates) {
      const coordinates = this.geozone.envelope.coordinates;
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
    if (this._envelope()?.[0]?.coordinates?.length > 1) {
      this.mapComponent?.map?.fitBounds([
        this._envelope()[0]?.coordinates[0],
        this._envelope()[0]?.coordinates[2]
      ], { padding: 75 });
    }
  }

  async initiateDelete() {
    console.log('Delete action initiated for geozone:', this.geozone);
    await this.displayConfirmationModal()
  }

  async displayConfirmationModal() {
    const details: ModalRowSpec[] = [
      { label: 'Geozone to delete', value: this.geozone?.displayName },
    ];

    // Show the modal with the confirmation details.
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Confirm Delete Geozone',
        details,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        confirmClass: 'btn btn-primary',
        cancelClass: 'btn btn-outline-secondary'
      }
    });

    // Listen for confirmation and cancellation events from the modal.
    const modalContent = modalRef.content as ConfirmationModalComponent;
    modalContent.confirmButton.subscribe(async () => {
      const collectionId = this.geozone?.pk.split('::')[1];
      const geozoneId = this.geozone?.sk;
      const res = await this.geozoneService.deleteGeozone(collectionId, geozoneId)
      modalRef.hide();
      if (res) {
        console.log('Geozone deleted successfully:', res);
        this.router.navigate(['/']);
      }
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

  // Load relationships for the current geozone
  // Fetches facility and geozone relationships from the relationships endpoint
  async loadRelationships() {
    if (!this.geozone?.pk || !this.geozone?.sk) {
      console.warn('Cannot load relationships: Activity missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      // Fetch facility relationships
      await this.loadFacilityRelationships();

      // Fetch geozone relationships
      await this.loadActivityRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }


  // Load and fetch facility entities that are related to this geozone
  async loadFacilityRelationships() {
    try {
      // Get facility relationships for this geozone with entity data expanded
      // bidirectional=true will include both:
      // 1. Facilities that the geozone is linked TO (forward)
      // 2. Facilities that are linked to the geozone (reverse via GSI)
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.geozone.pk,
        this.geozone.sk,
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


  // Load and fetch activity entities that are related to this geozone
  async loadActivityRelationships() {
    try {
      // Get activity relationships for this geozone with entity data expanded
      // bidirectional=true will include both forward and reverse relationships
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.geozone.pk,
        this.geozone.sk,
        'activity', // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        console.log(`Found ${relationshipsResponse.length} geozone relationships`);

        // Extract the entity data directly from expanded relationships
        this.relatedActivities = relationshipsResponse
          .map((rel: any) => rel.entity)
          .filter((entity: any) => entity !== null);

      } else {
        console.log('No geozone relationships found');
        this.relatedActivities = [];
      }
    } catch (error) {
      console.error('Error loading geozone relationships:', error);
      this.relatedActivities = [];
    }
  }
}
