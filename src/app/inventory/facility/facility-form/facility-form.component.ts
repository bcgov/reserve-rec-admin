import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, effect, EventEmitter, OnInit, Output, signal, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { Constants } from '../../../app.constants';
import { GeozoneService } from '../../../services/geozone.service';
import { LoadingService } from '../../../services/loading.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-facility-form',
  imports: [NgdsFormsModule, MapComponent, LoadalComponent, CommonModule],
  templateUrl: './facility-form.component.html',
  styleUrl: './facility-form.component.scss'
})
export class FacilityFormComponent implements OnInit, AfterViewChecked {
  @ViewChild('mapComponent', { static: true }) mapComponent!: MapComponent;
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;

  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();

  public form;
  public facility;
  public _locationMarker: WritableSignal<any[]> = signal([]);
  public _minMapZoom: WritableSignal<any> = signal(6);
  public _maxMapZoom: WritableSignal<any> = signal(15);
  public defaultCoordinates = [-125.58725792949612, 49.52175870730247];
  public defaultFacilityName = 'New Facility';
  public defaultFacilityType = 'general';
  public facilitySubtypes = [];
  public markerOptions = {
    displayName: this.defaultFacilityName,
    color: '#003366',
    draggable: true,
    minZoom: this._minMapZoom(),
    maxZoom: this._maxMapZoom(),
  };

  public timezones = Constants.timezones;
  public facilityTypes = Object.entries(Constants.facilityTypes).map(([key, value]) => value);


  constructor(
    protected cdr: ChangeDetectorRef,
    protected geozoneService: GeozoneService,
    protected loadingService: LoadingService,
    protected router: Router,
    protected route: ActivatedRoute
  ) {
    if (this.route?.parent?.snapshot?.data?.['facility']) {
      this.facility = this.route.parent.snapshot.data['facility'];
    }
    // Initialize the location marker with an empty array
    effect(() => {
      this.updateLocationMarkers();
    });
  };

  ngOnInit(): void {
    this.facilityTypes = this.facilityTypes.filter(type => type.value !== 'noType'); // Exclude 'general' type from the list
    this.form = new UntypedFormGroup({
      collectionId: new UntypedFormControl(
        this.facility?.collectionId || '',
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      facilityType: new UntypedFormControl(
        this.facility?.facilityType || null,
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      displayName: new UntypedFormControl(
        this.facility?.displayName || this.defaultFacilityName,
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      location: new UntypedFormGroup({
        latitude: new UntypedFormControl(
          this.facility?.location?.coordinates?.[1] || this.defaultCoordinates[1],
          {
            nonNullable: true,
            validators: [Validators.required]
          }
        ),
        longitude: new UntypedFormControl(
          this.facility?.location?.coordinates?.[0] || this.defaultCoordinates[0],
          {
            nonNullable: true,
            validators: [Validators.required]
          }
        )
      }),
      minMapZoom: new UntypedFormControl(
        this.facility?.minMapZoom || this._minMapZoom(),
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      maxMapZoom: new UntypedFormControl(
        this.facility?.maxMapZoom || this._maxMapZoom(),
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      timezone: new UntypedFormControl(
        this.facility?.timezone || 'America/Vancouver',
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      facilitySubType: new UntypedFormControl(
        this.facility?.facilitySubType || null
      ),
      address: new UntypedFormControl(
        this.facility?.address || null,
      ),
      activities: new UntypedFormControl([
        this.formatActivities(this.facility?.activities || []),
      ]),
      description: new UntypedFormControl(
        this.facility?.description || '',
      ),
      isVisible: new UntypedFormControl(
        this.facility?.isVisible || true
      ),
      orcs: new UntypedFormControl(
        this.facility?.orcs || ''
      ),
      imageUrl: new UntypedFormControl(
        this.facility?.imageUrl || ''
      ),
      searchTerms: new UntypedFormControl(
        this.facility?.searchTerms || ''
      ),
      adminNotes: new UntypedFormControl(
        this.facility?.adminNotes || ''
      ),
      meta: new UntypedFormGroup({
        enforceZoomVisibility: new UntypedFormControl(false)
      }
      )
    });
    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });
    this.form.get('displayName').valueChanges.subscribe((value) => {
      this.markerOptions['displayName'] = value;
      this.updateLocationMarkers();
    });
    this.form.get('facilityType').valueChanges.subscribe((value) => {
      this.updateFacilitySubTypeOptions();
    });
    this.form.get('location').valueChanges.subscribe((value) => {
      this.updateLocationMarkers();
    });
    this.form.get('minMapZoom').valueChanges.subscribe((value) => {
      this._minMapZoom.set(value);
      this.updateLocationMarkers();
      if (this.form.get('meta.enforceZoomVisibility').value) {
        this.mapComponent?.updateMap();
      }
    });
    this.form.get('maxMapZoom').valueChanges.subscribe((value) => {
      this._maxMapZoom.set(value);
      this.updateLocationMarkers();
      if (this.form.get('meta.enforceZoomVisibility').value) {
        this.mapComponent?.updateMap();
      }
    });
    this.updateFacilitySubTypeOptions();
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
  }

  updateLocationMarkers() {
    // Update the location marker signal with the new coordinates
    const location = this.form.get('location').value;
    this._locationMarker.set([{
      coordinates: [location.longitude, location.latitude],
      options: this.markerOptions
    }]);

    // This items might get skipped but are required in form submission,
    // mark as dirty to ensure they are included.
    this.form.get('timezone').markAsDirty();
    this.form.get('minMapZoom').markAsDirty();
    this.form.get('maxMapZoom').markAsDirty();
    this.cdr.detectChanges();
  }

  updateLocationGeospatial(event) {
    this.form.get('location').patchValue({
      latitude: event[0].coordinates[1],
      longitude: event[0].coordinates[0]
    });
    this.form.get('location.latitude').markAsDirty();
    this.form.get('location.longitude').markAsDirty();
  }

  centerMapOnLocation(zoom = 12) {
    const location = this.form.get('location').value;
    this.mapComponent?.map?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: zoom,
      essential: true // This ensures the animation is not interrupted by user interactions
    });
  }

  updateFacilitySubTypeOptions() {
    const type = this.form.get('facilityType')?.value;
    this.facilitySubtypes = Object.entries(Constants.facilityTypes?.[type]?.subTypes || {}).map(([key, value]) => value);
  }

  formatActivities(activities: any[]) {
    // When activityService is available, this should format the activities associated
    // with the facility. On its own, a facility object in the database only has an array
    // of activity pk/sks, but if 'fetchActivites' is passed to the API with GET facility,
    // the API also looks up the activity objects based on those pk/sks and staples them
    // onto the retuned facility object.
    // This function should check to see whether the current facility has activities, and
    // whether or not they are represented as full objects or just pk/sks.
    // If they are full objects, it should return them as is to be used in a FormArray.
    // If they are just pk/sks, activityService should be used to fetch the full objects
    // and then return them as a FormArray.
    // When submitting the form, the activities will be converted back to just pk/sks, but
    // the page will need the information of the full objects to display in the form.
    return null;
  }

}
