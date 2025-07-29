import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  WritableSignal,
  signal,
  AfterViewChecked,
  Output,
  EventEmitter
} from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilityService } from '../../../services/facility.service';
import { GeozoneService } from '../../../services/geozone.service';
import { MapComponent } from '../../../map/map.component';
import { Constants } from '../../../app.constants';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { ProtectedAreaService } from '../../../services/protected-area.service';

@Component({
  selector: 'app-activity-form',
  imports: [NgdsFormsModule, CommonModule, MapComponent, LoadalComponent, SearchTermsComponent],
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss']
})
export class ActivityFormComponent implements OnInit, AfterViewChecked {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('mapComponent', { static: false }) mapComponent!: MapComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;

  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();

  public form: UntypedFormGroup;
  public activity: any;
  public defaultActivityName = 'New Activity';
  public activityTypes = Object.values(Constants.activityTypes)
  public activitySubTypes: any[] = [];

  public protectedAreas: any[] = [];
  public facilities: any[] = [];
  public geozones: any[] = [];
  public currentMapMarker: any[] = [];
  private protectedAreasData: any[] = [];
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

  constructor(
    private cdr: ChangeDetectorRef,
    private protectedAreaService: ProtectedAreaService,
    public loadingService: LoadingService,
    private facilityService: FacilityService,
    private geozoneService: GeozoneService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (this.route?.parent?.snapshot?.data?.['activity']) {
      this.activity = this.route.parent.snapshot.data['activity'];
    }
    // Initialize protected areas from route resolver data
    this.route.data.subscribe((data) => {
      if (data?.['protectedAreas']?.data) {
        this.protectedAreasData = data['protectedAreas'].data.items;
        this.buildProtectedAreasList();
      }
    });

    // Set default values for map
    this._locationMarkers.set([{
      coordinates: this.defaultCoordinates,
      options: this.markerOptions
    }]);

    this._envelopeMarkers.set([{
      coordinates: this.defaultEnvelopeCoordinates,
      options: this.envelopeOptions
    }]);
  }

  async ngOnInit() {
    this.activityTypes = this.activityTypes.filter(type => type.value !== 'noType');
    this.activitySubTypes = [];

    // Initialize form first to prevent template errors
    this.initializeForm();

    if (this.activity) {
      await this.getProtectedArea();
      await this.getFacilities();
      await this.getGeozones();
      // Populate form with activity data after loading related data
      this.populateFormWithActivityData();
    }

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });

    this.form.get('protectedArea').valueChanges.subscribe(() => {
      this.updateOrcs();
      this.getFacilities();
      this.getGeozones();
    });
  }

  private initializeForm() {
    this.form = new UntypedFormGroup({
      acCollectionId: new UntypedFormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      protectedArea: new UntypedFormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      orcs: new UntypedFormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      facility: new UntypedFormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      facilityPkSk: new UntypedFormControl('', {
        nonNullable: true
      }),
      displayName: new UntypedFormControl(this.defaultActivityName, {
        nonNullable: true,
        validators: [Validators.required]
      }),
      activityType: new UntypedFormControl('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      isVisible: new UntypedFormControl(false),
      description: new UntypedFormControl(''),
      geozone: new UntypedFormControl(''),
      geozonePkSk: new UntypedFormControl(''),
      activitySubType: new UntypedFormControl(''),
      imageUrl: new UntypedFormControl(''),
      searchTerms: new UntypedFormControl([]),
      adminNotes: new UntypedFormControl('')
    });
  }

  populateFormWithActivityData() {
    if (!this.activity) return;

    // Get the facility display name if facilities data is available
    let facilityDisplayName = '';
    if (this.activity.facilities && this.facilities.length > 0) {
      const matchedFacility = this.facilities.find(f => 
        f.label.pk === this.activity.facilities.pk && f.label.sk === this.activity.facilities.sk
      );
      facilityDisplayName = matchedFacility?.value || '';
    }

    // Get the geozone display name if geozones data is available
    let geozoneDisplayName = '';
    if (this.activity.geozone && this.geozones.length > 0) {
      const matchedGeozone = this.geozones.find(g => 
        g.label.pk === this.activity.geozone.pk && g.label.sk === this.activity.geozone.sk
      );
      geozoneDisplayName = matchedGeozone?.value || '';
    }

    // Update form with activity data
    this.form.patchValue({
      acCollectionId: this.activity?.acCollectionId || '',
      protectedArea: this.activity?.protectedArea || '',
      orcs: this.activity?.orcs || '',
      facility: facilityDisplayName,
      facilityPkSk: this.activity?.facilities || '',
      displayName: this.activity?.displayName || this.defaultActivityName,
      activityType: this.activity?.activityType || '',
      isVisible: this.activity?.isVisible !== undefined ? this.activity?.isVisible : false,
      description: this.activity?.description || '',
      geozone: geozoneDisplayName,
      geozonePkSk: this.activity?.geozone || '',
      activitySubType: this.activity?.activitySubType || '',
      imageUrl: this.activity?.imageUrl || '',
      searchTerms: this.activity?.searchTerms?.split(',') || [],
      adminNotes: this.activity?.adminNotes || ''
    });

    // Update activity sub types based on activity type
    if (this.activity.activityType) {
      this.updateFilteredActivitySubTypes();
    }

    // Update map markers if geozone is set
    if (geozoneDisplayName) {
      this.updateCurrentMapMarker();
    }

    this.cdr.detectChanges();
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  // Build typeahead list of protected areas, sorted alphabetically
  buildProtectedAreasList() {
    this.protectedAreas = this.protectedAreasData
      .map(item => ({ label: item.orcs, value: item.displayName }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }

  // Update ORCS based on selected protected area
  async updateOrcs() {
    const selectedAreaName = this.form.get('protectedArea')?.value;

    // Only continue if value matches one of the known protected areas
    const matchedPA = this.protectedAreasData.find(pa => pa.displayName === selectedAreaName);
    if (!matchedPA) {
      return;
    }
    // Find the selected protected area and set ORCS
    const orcs = matchedPA.orcs;
    const orcsControl = this.form.get('orcs');
    orcsControl?.setValue(`${orcs}`);
    orcsControl?.markAsDirty();

    this.cdr.detectChanges();
  }

  async getProtectedArea() {
    const orcs = this.activity?.orcs || null;
    if (orcs) {
      try {
        const protectedArea = await this.protectedAreaService.getProtectedAreaByOrcs(orcs);
        this.activity.protectedArea = protectedArea?.displayName || null;
      } catch (error) {
        console.error('Error fetching protected area:', error);
        this.activity.protectedArea = null;
      }
    } else {
      this.activity.protectedArea = null;
    }
  }

  async getFacilities() {
    const collectionId = this.activity?.acCollectionId.split('_')[0] || this.form.get('acCollectionId').value;
    const orcs = this.activity?.orcs || this.form.get('orcs').value;

    // Load facilities based on collectionId and ORCS
    const facilitiesRes = await this.facilityService.getFacilitiesByCollectionId(`${collectionId}_${orcs}`);
    this.facilities = facilitiesRes?.items?.map(f => ({
      label: { pk: f.pk, sk: f.sk },
      value: f.displayName,
    })) || [];

    this.cdr.detectChanges();
  }

  updateFacility() {
    // Update facilityPkSk with the label of the selected facility
    const selectedFacility = this.form.get('facility')?.value;
    const facilityPkSk = this.facilities.find(f => f.value === selectedFacility)?.label;
    this.form.get('facilityPkSk')?.setValue(facilityPkSk);
    this.form.get('facilityPkSk')?.markAsDirty();

    this.cdr.detectChanges();
  }

  // Load geozones based on ORCS
  async getGeozones() {
    const collectionId = this.activity?.acCollectionId.split('_')[0] || this.form.get('acCollectionId').value;
    const orcs = this.activity?.orcs || this.form.get('orcs').value;

    const geozoneRes = await this.geozoneService.getGeozoneByCollectionId(`${collectionId}_${orcs}`);
    this.geozones = geozoneRes?.items?.map(g => ({
      label: {pk: g.pk, sk: g.sk},
      value: g.displayName,
      coordinates: [g.location.coordinates[0], g.location.coordinates[1]],
      location: {
        latitude: g.location.coordinates[1],
        longitude: g.location.coordinates[0]
      },
      envelope: g.envelope ? {
        southwest: {
          latitude: g.envelope.coordinates[0][1],
          longitude: g.envelope.coordinates[0][0]
        },
        northeast: {
          latitude: g.envelope.coordinates[1][1],
          longitude: g.envelope.coordinates[1][0]
        }
      } : null
    })) || [];

    this.cdr.detectChanges();
  }

  updateCurrentMapMarker(): any {
    // Return current location markers
    this.currentMapMarker = this.form.get('geozone')?.value || this.defaultGeozoneName;
    const selectedGeozone = this.geozones.find(g => g?.value === this.currentMapMarker);

    // Update geozonePkSk with the label of the selected geozone
    if (selectedGeozone) {
      this.form.get('geozonePkSk')?.setValue(selectedGeozone?.label);
      this.form.get('geozonePkSk')?.markAsDirty();
    }

    if (this.currentMapMarker && selectedGeozone) {
      return this.updateMapMarkers(selectedGeozone);
    } else {
      // Clear markers if no valid selection
      this._locationMarkers.set([]);
      this._envelopeMarkers.set([]);
      return [];
    }
  }

  updateMapMarkers(selectedGeozone) {
    if (selectedGeozone) {
      this._locationMarkers.set([{
        coordinates: selectedGeozone.coordinates,
        options: this.markerOptions
      }]);

      if (selectedGeozone.envelope) {
        const sw = selectedGeozone.envelope.southwest;
        const ne = selectedGeozone.envelope.northeast;
        const envelopePolygon = [
          [sw.longitude, sw.latitude],
          [ne.longitude, sw.latitude],
          [ne.longitude, ne.latitude],
          [sw.longitude, ne.latitude],
          [sw.longitude, sw.latitude]
        ];
        this._envelopeMarkers.set([{
          coordinates: envelopePolygon,
          options: this.envelopeOptions
        }]);
      } else {
        this._envelopeMarkers.set([]);
      }
    } else {
      this._locationMarkers.set([]);
      this._envelopeMarkers.set([]);
    }
    
    // Log the current marker state
    console.log('Current location markers:', this._locationMarkers());
    console.log('Current envelope markers:', this._envelopeMarkers());
   
    this.centerMapOnLocation();
    this.cdr.detectChanges();
  }

  centerMapOnLocation(zoom = 12) {
    const location = this.geozones.find(g => g.value === this.currentMapMarker)['location'];

    this.mapComponent?.map?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: zoom,
      essential: true
    });
  }


  // Update filtered activity sub types when activity type changes
  updateFilteredActivitySubTypes() {
    const selectedType = this.form.get('activityType')?.value;
    if (selectedType) {
      this.activitySubTypes = Object.entries(Constants.activityTypes[selectedType]?.subTypes || {}).map(([key, value]) => value);
    } else {
      this.activitySubTypes = [];
    }
    this.cdr.detectChanges();
  }

  // Handle search terms updates from the component
  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.cdr.detectChanges();
  }

  // Mark the search terms form control as dirty when a term is added
  onSearchTermDirty() {
    this.form.get('searchTerms')?.markAsDirty();
  }

  createGripElement(text) {
    // Create a new grip element for the envelope marker
    const gripElement = document.createElement('div');
    gripElement.className = 'badge bg-warning text-dark rounded-pill ';
    gripElement.style.fontSize = '0.8rem';
    gripElement.textContent = text; // Set the text content of the grip
    return gripElement;
  }

  // Allow user to go an create a new facility
  navigateCreateFacility() {
    const collectionId = this.form.get('acCollectionId')?.value;
    const orcs = this.form.get('orcs')?.value;
    this.router.navigate([`/inventory/facility/create/${collectionId}/${orcs}`]);
  }
  
  // Allow user to go an create a new facility
  navigateCreateGeozone() {
    const collectionId = this.form.get('acCollectionId')?.value;
    const orcs = this.form.get('orcs')?.value;
    this.router.navigate([`/inventory/geozone/create/${collectionId}/${orcs}`]);
  }
}
