import { AfterViewChecked, ChangeDetectorRef, Component, effect, EventEmitter, Input, OnInit, Output, signal, TemplateRef, ViewChild, WritableSignal } from '@angular/core';
import { MapComponent } from '../../../map/map.component';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { Constants } from '../../../app.constants';
import { LoadingService } from '../../../services/loading.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { WysiwygInputComponent } from '../../../shared/components/wysiwyg-editor/wysiwyg-editor.component';
import { EntityRelationshipSelectorComponent } from '../../../shared/components/entity/entity-relationship-selector/entity-relationship-selector.component';
import { ActivityService } from '../../../services/activity.service';
import { EntityFormBaseComponent } from '../../../shared/components/entity/entity-base/entity-form-base.component';
@Component({
  selector: 'app-facility-form',
  imports: [
    NgdsFormsModule,
    MapComponent,
    CommonModule,
    SearchTermsComponent,
    WysiwygInputComponent,
    ReactiveFormsModule,
    EntityRelationshipSelectorComponent,
  ],
  providers: [],
  templateUrl: './facility-form.component.html',
  styleUrl: './facility-form.component.scss'
})
export class FacilityFormComponent extends EntityFormBaseComponent implements OnInit, AfterViewChecked {
  @ViewChild('mapComponent', { static: true }) mapComponent!: MapComponent;
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;

  @ViewChild('activityItemTemplate') activityItemTemplate: TemplateRef<any>;
  @ViewChild('activitySelectionTemplate') activitySelectionTemplate: TemplateRef<any>;
  @ViewChild('activityRelationshipSelector') activityRelationshipSelector: EntityRelationshipSelectorComponent;

  @Input() isCreating: boolean = false;
  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();
  
  public form;
  public facility;
  public _locationMarker: WritableSignal<any[]> = signal([]);
  public _minMapZoom: WritableSignal<any> = signal(6);
  public _maxMapZoom: WritableSignal<any> = signal(15);
  public defaultCoordinates = [-125.123456789, 49.987654321];
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

  // Activity selection
  public activitiesLoading: boolean = false;
  public initialActivities = [];
  public _activities: WritableSignal<any[]> = signal([]);

  constructor(
    cdr: ChangeDetectorRef,
    protected loadingService: LoadingService,
    protected activityService: ActivityService,
    protected router: Router,
    protected route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    super(cdr);
    if (this.route?.parent?.snapshot?.data?.['facility']) {
      this.facility = this.route.parent.snapshot.data['facility'];
      this.initialActivities = this.facility.activities || [];
      this.initializeRelationshipConfigs();
    }

    this.initializeForm();

    effect(() => {
      this.updateLocationMarkers();
      console.log('this.facility', this.facility);
    });
  };

  ngOnInit() {
    this.facilityTypes = this.facilityTypes.filter(type => type.value !== 'noType'); // Exclude 'general' type from the list
    this.updateFacilitySubTypeOptions();
  }

  private initializeForm() {
    this.form = this.fb.group({
      activities: [this.facility?.activities || []],
      adminNotes: [this.facility?.adminNotes || ''],
      agreements: [this.facility?.agreements || ''],
      collectionId: [this.facility?.collectionId || '', {
        nonNullable: true,
        validators: [Validators.required],
        updateOn: 'blur'
      }],
      description: [this.facility?.description || ''],
      displayName: [this.facility?.displayName || this.defaultFacilityName, {
        nonNullable: true,
        validators: [Validators.required]
      }],
      facilityType: [this.facility?.facilityType || null, {
        nonNullable: true,
        validators: [Validators.required]
      }],
      facilitySubType: [this.facility?.facilitySubType || null],
      geozones: [this.facility?.geozones || []],
      isOpen: [this.facility?.isOpen || false],
      isVisible: [this.facility?.isVisible || false],
      location: this.fb.group({
        latitude: [
          this.facility?.location?.coordinates?.[1] || this.defaultCoordinates[1],
          [Validators.required]
        ],
        longitude: [
          this.facility?.location?.coordinates?.[0] || this.defaultCoordinates[0],
          [Validators.required]
        ],
      }),
      maxMapZoom: [this.facility?.maxMapZoom || this._maxMapZoom(), [Validators.required]],
      minMapZoom: [this.facility?.minMapZoom || this._minMapZoom(), [Validators.required]],
      meta: this.fb.group({
        enforceZoomVisibility: [false]
      }),
      passesRequired: [this.facility?.passesRequired || false],
      searchTerms: [this.facility?.searchTerms || []],
      timezone: [this.facility?.timezone || 'America/Vancouver', {
        nonNullable: true,
        validators: [Validators.required]
      }],
    }, {
      validators: [
        this.coordinatesWithinBoundsValidator,
        this.displayNameValidator
      ]
    });

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
    });
    this.form.get('displayName').valueChanges.subscribe((value) => {
      this.markerOptions['displayName'] = value;
      this.updateLocationMarkers();
    });
    this.form.get('facilityType').valueChanges.subscribe(() => {
      this.updateFacilitySubTypeOptions();
    });
    this.form.get('location').valueChanges.subscribe(() => {
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
  }

  ngAfterViewChecked() {
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

  // Handle search terms updates from the component
  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.form.get('searchTerms')?.markAsDirty();
  }

  navigateToEntityRelationships() {
    const collectionId = this.form.get('collectionId')?.value;
    const facilityType = this.form.get('facilityType')?.value;
    const facilityId = this.facility?.facilityId;
    this.router.navigate(['/inventory/create/relationships'], {
      queryParams: {
        collectionId: collectionId,
        sourceEntityType: 'facility',
        sourceEntity: `facility::${collectionId}::${facilityType}::${facilityId}`
      }
    });
  }

  // Initialize the relationship config
  // This works by setting the source and the target (facility and activity)
  // Which uses fetchFn to load all available entities of the target (activity)
  initializeRelationshipConfigs() {
    // Activity selection configuration
    this.setRelationshipConfig('activity', {
      sourceSchema: 'facility',
      targetSchema: 'activity',
      label: '',
      placeholder: 'Start typing to search activities...',
      multiselect: true,
      selectedItemTemplate: this.activityItemTemplate,
      selectionListTemplate: this.activitySelectionTemplate,
      searchFields: {
        collectionId: this.facility?.collectionId
      },
      fetchFn: async (searchFields) => {
        // Only fetch activities if collectionId is set
        if (this.form.get('collectionId')?.value) {
          const result = await this.activityService.getActivitiesByCollectionId(
            searchFields.collectionId
          );
          this.initialActivities = [...result.items]
          return result;
        }
      },
      filterFn: (activity, searchFields) => {
        // Only show activities matching the facility's collectionId
        return activity.collectionId === searchFields.collectionId;
      }
    });
  }

  // Handle activity selection changes and update the activities form control
  override onRelationshipsChanged(type: string, entities: any[]) {
    if (type === 'activity') {
      this.form.get('activities')?.setValue(entities);
      this.form.get('activities')?.markAsDirty();
    }

    super.onRelationshipsChanged(type, entities);
  }

  // Handle activity relationships loaded (for edit mode)
  override onRelationshipsLoaded(type: string, entities: any[]) {
    super.onRelationshipsLoaded(type, entities);
  }

  // Check if an entity is currently selected — delegates to base with type key
  isActivitySelected(entity: any): boolean {
    return this.isEntitySelected('activity', entity);
  }

  // Custom validator to ensure displayName is not the default placeholder
  private displayNameValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const displayName = group.get('displayName')?.value;

    // Check that the value is a string, not empty, and not the default placeholder
    if (typeof displayName === 'string' && displayName.trim().length > 0 && displayName !== 'New Facility') {
      return null;
    }
    return { invalidDisplayName: true };
  }

  // Validator to inform the user when their lat/long is whack
  private coordinatesWithinBoundsValidator = (control: AbstractControl) => {
    const locationGroup = control.get('location');
    if (locationGroup) {
      const latitude = locationGroup.get('latitude')?.value;
      const longitude = locationGroup.get('longitude')?.value;

      // Show errors if both latitude and longitude are default values, or out of bounds
      const errors = {};

      const [defaultLng, defaultLat] = this.defaultCoordinates;
      if (this.isCreating && latitude === defaultLat && longitude === defaultLng) {
        errors['defaultCoordinates'] = true;
      }

      if (latitude < 48 || latitude > 61) {
        errors['latitudeOutOfBounds'] = true;
      }
      if (longitude < -140 || longitude > -110) {
        errors['longitudeOutOfBounds'] = true;
      }
      return Object.keys(errors).length > 0 ? errors : null; 
    }
    return null;
  }

  // Use this to track if location and zoom are altered on form
  onEventInput(event: Event, componentRef: any) {
    if ((event.target as HTMLInputElement).value === '') {
      componentRef.displayValue = undefined;
    }
  }

  // Reset the form to the original facility values, including restoring the initial relationships state
  resetToFacility(facility: any, initialRelationships: Map<string, any[]>) {
    const resetValue = {
      ...facility,
      location: {
        latitude: facility?.location?.coordinates?.[1] ?? null,
        longitude: facility?.location?.coordinates?.[0] ?? null,
      }
    };
    this.form.reset(resetValue);

    // Restore relationship selector visual state without an API round-trip.
    this.resetSelectedEntities(initialRelationships);

    for (const [type, items] of initialRelationships) {
      this.form.get(type)?.setValue(items);
      this.facility.activities = items;
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
