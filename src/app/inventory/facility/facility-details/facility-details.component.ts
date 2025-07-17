import { AfterViewInit, ChangeDetectorRef, Component, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Constants } from '../../../app.constants';
import { SearchResultComponent } from '../../search-results-table/search-result/search-result.component';

@Component({
  selector: 'app-facility-details',
  imports: [UpperCasePipe, MapComponent, DatePipe, CommonModule, SearchResultComponent],
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

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute
  ) {
    if (this.route.snapshot.data['facility']) {
      this.facility = this.route.snapshot.data['facility'];
    }
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

}
