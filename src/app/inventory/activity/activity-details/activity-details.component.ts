import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { GeozoneService } from '../../../services/geozone.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationModalComponent, ModalRowSpec } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ActivityService } from '../../../services/activity.service';
import { Constants } from '../../../app.constants';
import { FacilityService } from '../../../services/facility.service';

@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, DatePipe, MapComponent],
  templateUrl: './activity-details.component.html',
  styleUrl: './activity-details.component.scss',
  providers: [BsModalService]
})
export class ActivityDetailsComponent {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
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

  constructor(
    private activityService: ActivityService,
    private geozoneService: GeozoneService,
    private facilityService: FacilityService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: BsModalService
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe((data) => {
      if (data?.['activity']) {
        this.activity = data['activity'];
        // Refresh geozone data when activity changes
        this.getGeozoneData();
        this.getFacility();
      }
    });
  }

  async getGeozoneData() {
    const gzCollectionId = this.activity?.geozone?.pk.split('::')[1];
    const geozoneId = this.activity?.geozone?.sk;
    if (gzCollectionId && geozoneId) {
      try {
        const geozoneData = await this.geozoneService.getGeozone(gzCollectionId, geozoneId);
        this.location = geozoneData?.items?.[0]?.location || null;
        this.envelope = geozoneData?.items?.[0]?.envelope || null;
        this.updateMarkers();
        this.updateEnvelope();
      } catch (error) {
        console.error('Error fetching geozone data:', error);
      }
    }
  }

  async getFacility() {
    const fcCollectionId = this.activity?.facilities?.pk.split('::')[1];
    const facilityType = this.activity?.facilities?.sk.split('::')[0];
    const facilityId = this.activity?.facilities?.sk.split('::')[1];
    const facility = await this.facilityService.getFacility(fcCollectionId, facilityType, facilityId);
    this.facility = facility.displayName || null;
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
      if (this._envelope()?.[0]?.coordinates?.length > 2) {
        this.mapComponent?.map?.fitBounds([
          this._envelope()[0].coordinates[0],
          this._envelope()[0].coordinates[2]
        ], { padding: 75 });
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
    if (this._envelope()?.[0]?.coordinates?.length > 1) {
      this.mapComponent?.map?.fitBounds([
        this._envelope()[0]?.coordinates[0],
        this._envelope()[0]?.coordinates[2]
      ], { padding: 75 });
    }
  }

  async initiateDelete() {
    console.log('Delete action initiated for activity:', this.activity);
    await this.displayConfirmationModal()
  }

  async displayConfirmationModal() {
    const details: ModalRowSpec[] = [
      { label: 'Activity to delete', value: this.activity?.displayName },
    ];

    // Show the modal with the confirmation details.
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Confirm Delete Activity',
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
      const collectionId = this.activity?.pk.split('::')[1];
      const activityType = this.activity?.sk.split('::')[0];
      const activityId = this.activity?.sk.split('::')[1];
      const res = await this.activityService.deleteActivity(collectionId, activityType, activityId)
      modalRef.hide();
      if (res) {
        console.log('Activity deleted successfully:', res);
        this.router.navigate(['/']);
      }
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }
}
