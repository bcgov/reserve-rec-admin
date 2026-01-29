import { AfterViewInit, ChangeDetectorRef, Component, effect, EventEmitter, OnInit, Output, signal, ViewChild, WritableSignal } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { GeozoneService } from '../../../services/geozone.service';
import { LoadingService } from '../../../services/loading.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MapComponent } from '../../../map/map.component';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { Constants } from '../../../app.constants';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';

@Component({
  selector: 'app-geozone-form',
  imports: [MapComponent, LoadalComponent, NgdsFormsModule, CommonModule, SearchTermsComponent],
  templateUrl: './geozone-form.component.html',
  styleUrl: './geozone-form.component.scss'
})
export class GeozoneFormComponent implements OnInit, AfterViewInit {
  @ViewChild('mapComponent', { static: true }) mapComponent!: MapComponent;
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;

  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();

  public form;
  public geozone;
  public _locationMarkers: WritableSignal<any[]> = signal([]);
  public _envelopeMarkers: WritableSignal<any[]> = signal([]);
  public _minMapZoom: WritableSignal<any> = signal(6);
  public _maxMapZoom: WritableSignal<any> = signal(15);
  public defaultCoordinates = [-125.58725792949612, 49.52175870730247];
  public defaultEnvelopeCoordinates = [
    [-126.6177343750002, 49.97817890145478], // northwest
    [-124.57427734375025, 49.97817890145478], // northeast
    [-124.57427734375025, 48.83445775236865], // southeast
    [-126.6177343750002, 48.83445775236865], // southwest
    [-126.6177343750002, 49.97817890145478], // close polygon (back to northwest)
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

  public timezones = Constants.timezones;

  constructor(
    protected cdr: ChangeDetectorRef,
    protected geozoneService: GeozoneService,
    protected loadingService: LoadingService,
    protected router: Router,
    protected route: ActivatedRoute
  ) {
    if (this.route?.parent?.snapshot?.data?.['geozone']) {
      this.geozone = this.route.parent.snapshot.data['geozone'];
    }
    // Initialize the location marker with an empty array
    effect(() => {
      this.updateLocationMarkers();
      this.updateEnvelopeMarkers();
    });
  }

  ngOnInit(): void {
    this.initializeForm();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
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

  private initializeForm() {
    this.form = new UntypedFormGroup({
      collectionId: new UntypedFormControl(
        this.geozone?.collectionId || '',
        {
          nonNullable: true,
          validators: [Validators.required],
          updateOn: 'blur'
        }
      ),
      mandatoryFields: new UntypedFormGroup({
        displayName: new UntypedFormControl(
          this.geozone?.displayName || this.defaultGeozoneName,
          {
            nonNullable: true,
            validators: [Validators.required]
          }
        ),
        location: new UntypedFormGroup({
          latitude: new UntypedFormControl(
            this.geozone?.location?.coordinates?.[1] || this.defaultCoordinates[1],
            {
              nonNullable: true,
              validators: [Validators.required]
            }
          ),
          longitude: new UntypedFormControl(
            this.geozone?.location?.coordinates?.[0] || this.defaultCoordinates[0],
            {
              nonNullable: true,
              validators: [Validators.required]
            }
          ),
        }),
        envelope: new UntypedFormGroup({
          northwest: new UntypedFormGroup({
            latitude: new UntypedFormControl(
              this.geozone?.envelope?.coordinates?.[0][1] || this.defaultEnvelopeCoordinates[0][1],
              {
                nonNullable: true,
                validators: [Validators.required]
              }
            ),
            longitude: new UntypedFormControl(
              this.geozone?.envelope?.coordinates?.[0][0] || this.defaultEnvelopeCoordinates[0][0],
              {
                nonNullable: true,
                validators: [Validators.required]
              }
            ),
          }),
          southeast: new UntypedFormGroup({
            latitude: new UntypedFormControl(
              this.geozone?.envelope?.coordinates?.[1][1] || this.defaultEnvelopeCoordinates[2][1],
              {
                nonNullable: true,
                validators: [Validators.required]
              }
            ),
            longitude: new UntypedFormControl(
              this.geozone?.envelope?.coordinates?.[1][0] || this.defaultEnvelopeCoordinates[2][0],
              {
                nonNullable: true,
                validators: [Validators.required]
              }
            ),
          }),
        }),
        minMapZoom: new UntypedFormControl(
          this.geozone?.minMapZoom || this._minMapZoom(),
          {
            nonNullable: true,
            validators: [Validators.required]
          }
        ),
        maxMapZoom: new UntypedFormControl(
          this.geozone?.maxMapZoom || this._maxMapZoom(),
          {
            nonNullable: true,
            validators: [Validators.required]
          }
        ),
        timezone: new UntypedFormControl(
          this.geozone?.timezone || 'America/Vancouver',
          {
            nonNullable: true,
            validators: [Validators.required]
          }
        ),
      }),
      enforceZoomVisibility: new UntypedFormControl(
        false
      ),
      description: new UntypedFormControl(
        this.geozone?.description || '',
      ),
      isVisible: new UntypedFormControl(
        this.geozone?.isVisible || true
      ),
      imageUrl: new UntypedFormControl(
        this.geozone?.imageUrl || ''
      ),
      searchTerms: new UntypedFormControl(
        this.geozone?.searchTerms || []
      ),
      adminNotes: new UntypedFormControl(
        this.geozone?.adminNotes || ''
      ),
    });
  }


  ngAfterViewInit(): void {
    this.zoomToEnvelopeLimits();
    this.mapComponent?.map?.on('zoomend', () => {
      // Check if the enforceZoomVisibility is enabled
      if (this.form.get('enforceZoomVisibility').value) {
        // Update the visibility of markers and polygons based on the current zoom level
        this.mapComponent?.updateMap();
        this.cdr.detectChanges();
      }
    });
    this.cdr.detectChanges();
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
    const southeast = envelope.southeast;
    const northwest = envelope.northwest;
    this._envelopeMarkers.set([{
      coordinates: [
        [southeast.longitude, southeast.latitude],
        [northwest.longitude, southeast.latitude],
        [northwest.longitude, northwest.latitude],
        [southeast.longitude, northwest.latitude],
        [southeast.longitude, southeast.latitude] // Closing the polygon
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
    this.form.get('mandatoryFields.location.latitude').markAsDirty();
    this.form.get('mandatoryFields.location.longitude').markAsDirty();
  }

  updateEnvelopeGeospatial(event) {
    this.form.get('mandatoryFields.envelope').patchValue({
      northwest: {
        latitude: event[0].coordinates[2][1],
        longitude: event[0].coordinates[2][0]
      },
      southeast: {
        latitude: event[0].coordinates[0][1],
        longitude: event[0].coordinates[0][0]
      }
    });
    this.form.get('mandatoryFields.envelope.northwest.latitude').markAsDirty();
    this.form.get('mandatoryFields.envelope.northwest.longitude').markAsDirty();
    this.form.get('mandatoryFields.envelope.southeast.latitude').markAsDirty();
    this.form.get('mandatoryFields.envelope.southeast.longitude').markAsDirty();
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
    if (this._envelopeMarkers()?.[0]?.coordinates?.length > 1) {
      this.mapComponent?.map?.fitBounds([
        this._envelopeMarkers()[0].coordinates[2],
        this._envelopeMarkers()[0].coordinates[0]
      ], { padding: 75 });
    }
  }

  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.cdr.detectChanges();
  }

  // Mark the search terms form control as dirty when a term is added
  onSearchTermDirty() {
    this.form.get('searchTerms')?.markAsDirty();
  }


  // Generic utility method to map entities to pk/sk objects
  mapEntityPkSk(entities: any[]): { pk: string; sk: string }[] {
    if (!entities?.length) {
      return [];
    }
    return entities.map(entity => ({
      pk: entity.pk,
      sk: entity.sk
    }));
  }

  navigateToEntityRelationships() {
    const collectionId = this.form.get('collectionId')?.value;
    const geozoneId = this.geozone?.geozoneId;
    // Navigate to the entity relationships page for this geozone
    // Format: geozone::collectionId::geozoneId
    this.router.navigate(['/inventory/create/relationships'], {
      queryParams: {
        collectionId: collectionId,
        sourceEntityType: 'geozone',
        sourceEntity: `geozone::${collectionId}::${geozoneId}`
      }
    });
  }
}
