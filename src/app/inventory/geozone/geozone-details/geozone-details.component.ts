import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Input, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { GeozoneEditComponent } from '../geozone-edit/geozone-edit.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalRowSpec } from '../../../shared/components/search-terms/search-terms.component';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { GeozoneService } from '../../../services/geozone.service';
import { BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-geozone-details',
  imports: [CommonModule, UpperCasePipe, DatePipe, MapComponent],
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

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    protected geozoneService: GeozoneService,
    protected modalService: BsModalService
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


}
