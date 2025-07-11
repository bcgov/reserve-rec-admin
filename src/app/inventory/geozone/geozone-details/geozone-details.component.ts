import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Input, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { GeozoneEditComponent } from '../geozone-edit/geozone-edit.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-geozone-details',
  imports: [CommonModule, UpperCasePipe, DatePipe, MapComponent],
  templateUrl: './geozone-details.component.html',
  styleUrl: './geozone-details.component.scss'
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

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute
  ) {
    if (this.route.snapshot.data['geozone']) {
      this.geozone = this.route.snapshot.data['geozone'];
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


}
