import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, signal, WritableSignal } from '@angular/core';
import { GeozoneService } from '../../../services/geozone.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationModalComponent, ModalRowSpec } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ActivityService } from '../../../services/activity.service';
import { Constants } from '../../../app.constants';
import { FacilityService } from '../../../services/facility.service';
import { FacilityListItemComponent } from '../../facility/facility-list-item/facility-list-item.component';

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
      }
    });
  }

  async getGeozoneData() {
    const collectionId = this.activity?.geozone?.pk.split('::')[1];
    const geozoneId = this.activity?.geozone?.sk;
    if (collectionId && geozoneId) {
      try {
        const geozoneData = await this.geozoneService.getGeozone(collectionId, geozoneId);
        this.location = geozoneData?.items?.[0]?.location || null;
        this.envelope = geozoneData?.items?.[0]?.envelope || null;
        this.updateMarkers();
        this.updateEnvelope();
      } catch (error) {
        console.error('Error fetching geozone data:', error);
      }
    }
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
}
