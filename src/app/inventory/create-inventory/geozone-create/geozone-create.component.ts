import { AfterViewInit, ChangeDetectorRef, Component, ContentChild, effect, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { MapComponent } from '../../../map/map.component';
import { CommonModule } from '@angular/common';
import { GeozoneService } from '../../../services/geozone.service';
import { LoadingService } from '../../../services/loading.service';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-geozone-create',
  imports: [NgdsFormsModule, MapComponent, CommonModule, LoadalComponent],
  templateUrl: './geozone-create.component.html',
  styleUrl: './geozone-create.component.scss'
})
export class GeozoneCreateComponent implements OnInit, AfterViewInit {
  @ViewChild('mapComponent', { static: true }) mapComponent!: MapComponent;
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;

  public form: any = null;
  public _locationMarkers: WritableSignal<any[]> = signal([]);
  public _envelopeMarkers: WritableSignal<any[]> = signal([]);
  public _minMapZoom: WritableSignal<any> = signal(6);
  public _maxMapZoom: WritableSignal<any> = signal(15);
  public defaultCoordinates = [-125.58725792949612, 49.52175870730247];
  public defaultEnvelopeCoordinates = [
    [-126.6177343750002, 48.83445775236865], // southwest
    [-124.57427734375025, 48.83445775236865], // southeast
    [-124.57427734375025, 49.97817890145478], // northeast
    [-126.6177343750002, 49.97817890145478], // northwest
    [-126.6177343750002, 48.83445775236865], // close polygon (back to southwest)
  ];
  public defaultGeozoneName = 'New Geozone';
  public markerOptions = {
    displayName: this.defaultGeozoneName,
    color: 'goldenrod',
    draggable: true,
    minZoom: this._minMapZoom(),
    maxZoom: this._maxMapZoom(),
  };
  public envelopeOptions = {
    minZoom: this._minMapZoom(),
    maxZoom: this._maxMapZoom(),
    color: 'goldenrod',
    fillColor: 'goldenrod',
    fillOpacity: 0.5,
    gripAOptions: {
      color: 'goldenrod',
      draggable: true,
      element: this.createGripElement('A'), // Create a new grip element
      minZoom: this._minMapZoom(),
      maxZoom: this._maxMapZoom(),
    },
    gripBOptions: {
      color: 'goldenrod',
      draggable: true,
      element: this.createGripElement('B'), // Create a new grip element
      minZoom: this._minMapZoom(),
      maxZoom: this._maxMapZoom(),
    }
  };

  public timezones = [
    { value: 'America/Vancouver', display: 'America/Vancouver (Pacific Time, PST/PDT)' },
    { value: 'America/Edmonton', display: 'America/Edmonton (Mountain Time, MST/MDT)' },
    { value: 'America/Fort_Nelson', display: 'America/Fort_Nelson (Mountain Time, MST)' }
  ];

  constructor(
    protected cdr: ChangeDetectorRef,
    protected geozoneService: GeozoneService,
    protected loadingService: LoadingService,
    protected router: Router
  ) {
    // Initialize the location marker with an empty array
    effect(() => {
      this.toggleLoadel(this.loadingService.isLoading());
      this.updateLocationMarkers();
      this.updateEnvelopeMarkers();
    });
  }

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      gzCollectionId: new UntypedFormControl(''),
      mandatoryFields: new UntypedFormGroup({
        displayName: new UntypedFormControl(this.defaultGeozoneName, { nonNullable: true, validators: [Validators.required] }),
        location: new UntypedFormGroup({
          latitude: new UntypedFormControl(this.defaultCoordinates[1], { nonNullable: true, validators: [Validators.required] }),
          longitude: new UntypedFormControl(this.defaultCoordinates[0], { nonNullable: true, validators: [Validators.required] }),
        }),
        envelope: new UntypedFormGroup({
          southwest: new UntypedFormGroup({
            latitude: new UntypedFormControl(this.defaultEnvelopeCoordinates[0][1], { nonNullable: true, validators: [Validators.required] }),
            longitude: new UntypedFormControl(this.defaultEnvelopeCoordinates[0][0], { nonNullable: true, validators: [Validators.required] }),
          }),
          northeast: new UntypedFormGroup({
            latitude: new UntypedFormControl(this.defaultEnvelopeCoordinates[2][1], { nonNullable: true, validators: [Validators.required] }),
            longitude: new UntypedFormControl(this.defaultEnvelopeCoordinates[2][0], { nonNullable: true, validators: [Validators.required] }),
          }),
        }),
        minMapZoom: new UntypedFormControl(this._minMapZoom(), { nonNullable: true, validators: [Validators.required] }),
        maxMapZoom: new UntypedFormControl(this._maxMapZoom(), {
          nonNullable: true, validators: [Validators.required]
        }),
        timezone: new UntypedFormControl('America/Vancouver', { nonNullable: true, validators: [Validators.required] }),
      }),
      enforceZoomVisibility: new UntypedFormControl(false),
      description: new UntypedFormControl(''),
      isVisible: new UntypedFormControl(true),
      orcs: new UntypedFormControl(''),
      imageUrl: new UntypedFormControl(''),
      searchTerms: new UntypedFormControl(''),
      adminNotes: new UntypedFormControl(''),
    });
    this.form.get('mandatoryFields.displayName').valueChanges.subscribe((value) => {
      this.markerOptions['displayName'] = value;
      this.updateLocationMarkers();
    });
    this.form.get('mandatoryFields.location').valueChanges.subscribe((value) => {
      this.updateLocationMarkers();
    });
    this.form.get('mandatoryFields.envelope').valueChanges.subscribe((value) => {
      this.updateEnvelopeMarkers();
    });
    this.form.get('mandatoryFields.minMapZoom').valueChanges.subscribe((value) => {
      this._minMapZoom.set(value);
      this.updateLocationMarkers();
      this.updateEnvelopeMarkers();
      if (this.form.get('enforceZoomVisibility').value) {
        this.mapComponent?.updateMap();
      }
    });
    this.form.get('mandatoryFields.maxMapZoom').valueChanges.subscribe((value) => {
      this._maxMapZoom.set(value);
      this.updateLocationMarkers();
      this.updateEnvelopeMarkers();
      if (this.form.get('enforceZoomVisibility').value) {
        this.mapComponent?.updateMap();
      }
    });
  }

  toggleLoadel(isLoading) {
    if (isLoading) {
      this.loadal.show();
    } else {
      this.loadal.hide();
    }
  }

  ngAfterViewInit(): void {
    this.mapComponent?.map.on('zoomend', () => {
      // Check if the enforceZoomVisibility is enabled
      if (this.form.get('enforceZoomVisibility').value) {
        // Update the visibility of markers and polygons based on the current zoom level
        this.mapComponent?.updateMap();
      }
    });
  }

  createGripElement(text) {
    // Create a new grip element for the envelope marker
    const gripElement = document.createElement('div');
    gripElement.className = 'badge bg-warning text-dark rounded-pill ';
    gripElement.style.fontSize = '0.8rem';
    gripElement.textContent = text; // Set the text content of the grip
    return gripElement;
  }

  updateLocationMarkers() {
    // Update the location marker signal with the new coordinates
    const location = this.form.get('mandatoryFields.location').value;
    this._locationMarkers.set([{
      coordinates: [location.longitude, location.latitude],
      options: this.markerOptions
    }]);
    this.cdr.detectChanges();
  }

  updateEnvelopeMarkers() {
    // Update the envelope marker signal with the new coordinates
    const envelope = this.form.get('mandatoryFields.envelope').value;
    const southwest = envelope.southwest;
    const northeast = envelope.northeast;
    this._envelopeMarkers.set([{
      coordinates: [
        [southwest.longitude, southwest.latitude],
        [northeast.longitude, southwest.latitude],
        [northeast.longitude, northeast.latitude],
        [southwest.longitude, northeast.latitude],
        [southwest.longitude, southwest.latitude] // Closing the polygon
      ],
      options: this.envelopeOptions
    }]);
    this.cdr.detectChanges();
  }

  updateLocationGeospatial(event) {
    this.form.get('mandatoryFields.location').patchValue({
      latitude: event[0].coordinates[1],
      longitude: event[0].coordinates[0]
    });
  }

  updateEnvelopeGeospatial(event) {
    this.form.get('mandatoryFields.envelope').patchValue({
      southwest: {
        latitude: event[0].coordinates[0][1],
        longitude: event[0].coordinates[0][0]
      },
      northeast: {
        latitude: event[0].coordinates[2][1],
        longitude: event[0].coordinates[2][0]
      }
    });
  }

  centerMapOnLocation(zoom = 12) {
    const location = this.form.get('mandatoryFields.location').value;
    this.mapComponent?.map?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: zoom,
      essential: true // This ensures the animation is not interrupted by user interactions
    });
  }

  zoomToEnvelopeLimits() {
    this.mapComponent?.map?.fitBounds([
      this._envelopeMarkers()[0].coordinates[0],
      this._envelopeMarkers()[0].coordinates[2]
    ], { padding: 75 });
  }

  async submit() {
    const collectionId = this.form.get('gzCollectionId').value;
    const props = this.formatFormForSubmission();
    const res = await this.geozoneService.createGeozone(collectionId, props);
    // get newly created geozoneId from response
    const geozoneId = res[0]?.data?.geozoneId;
    if (geozoneId) {
      this.navigateToGeozone(collectionId, geozoneId);
    }
  }

  formatFormForSubmission() {
    const fields = this.form.value;
    const mandatoryFields = this.form.get('mandatoryFields').value;
    const props = { ...mandatoryFields, ...fields };
    props.location = {
      type: 'point',
      coordinates: [mandatoryFields.location.longitude, mandatoryFields.location.latitude]
    };
    props.envelope = {
      type: 'envelope',
      coordinates: [
        [mandatoryFields.envelope.southwest.longitude, mandatoryFields.envelope.southwest.latitude],
        [mandatoryFields.envelope.northeast.longitude, mandatoryFields.envelope.northeast.latitude]]
    };
    delete props.gzCollectionId; // Remove gzCollectionId from the props
    delete props.enforceZoomVisibility; // Remove enforceZoomVisibility from the props
    delete props.mandatoryFields; // Remove mandatoryFields from the props
    return props;
  }

  navigateToGeozone(gzCollectionId, geozoneId) {
    this.router.navigate([`/inventory/geozone/${gzCollectionId}/${geozoneId}`]);
    window.scrollTo(0, 0);
  }
}
