import { AfterViewChecked, ChangeDetectorRef, Component, ContentChildren, effect, ElementRef, OnChanges, OnDestroy, OnInit, signal, SimpleChanges, ViewChild, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { SearchService } from '../../services/search.service';
import { LoadingService } from '../../services/loading.service';
import { SearchResultsTableComponent } from '../search-results-table/search-results-table.component';
import { MapComponent } from '../../map/map.component';
import { Constants } from '../../app.constants';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-inventory-search',
  imports: [CommonModule, NgdsFormsModule, SearchResultsTableComponent, MapComponent],
  templateUrl: './inventory-search.component.html',
  styleUrl: './inventory-search.component.scss'
})
export class InventorySearchComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  @ViewChild('searchOverlay') searchOverlay!: ElementRef; // Adjust type as necessary
  public form;
  public searchResults = [];
  public mapResults: Set<any> = new Set();
  public _markers: WritableSignal<any[]> = signal([]);
  public _resultsSignal: WritableSignal<any[]> = signal([]);
  public _passiveResultsSignal: WritableSignal<any[]> = signal([]);
  public searchChangeFlag = false; // Flag to indicate if search results have changed
  public searchFiltersOpen = false; // Flag to indicate if search filters are open

  public markerSchemaOptions = {
    geozone: {
      color: '#F8BB47',
      icon: 'fa-solid fa-map-location-dot'
    },
    protectedArea: {
      color: '#42814A',
      icon: 'fa-solid fa-tree'
    },
    facility: {
      color: '#013366',
      icon: 'fa-solid fa-map-marker-alt'
    },
    default: {
      color: '#9F9D9C',
      icon: 'fa-solid fa-map-marker-alt'
    }
  };

  public schemaOptions = [
    { display: 'Protected Area', value: 'protectedArea' },
    { display: 'Geozone', value: 'geozone' },
    { display: 'Facility', value: 'facility' },
    { display: 'Activity', value: 'activity' },
    { display: 'Product', value: 'product', disabled: true },
    { display: 'Policy', value: 'policy', disabled: true }
  ];

  public facilityTypeOptions = [
    { display: 'Campground', value: 'campground', icon: 'fa-solid fa-campground' },
    { display: 'Natural Feature', value: 'naturalFeature', icon: 'fa-solid fa-mountain' },
    { display: 'Access Point', value: 'accessPoint', icon: 'fa-solid fa-anchor' },
    { display: 'Structure', value: 'structure', icon: 'fa-solid fa-building' },
    { display: 'Trail', value: 'trail', icon: 'fa-solid fa-hiking' },
  ];

  public facilitySubTypeOptions = {
    campground: [],
    naturalFeature: [
      { display: 'Waterfall', value: 'waterfall', icon: 'fa-solid fa-water' },
      { display: 'Lake', value: 'lake', icon: 'fa-solid fa-water' },
      { display: 'River', value: 'river', icon: 'fa-solid fa-water' },
      { display: 'Summit', value: 'summit', icon: 'fa-solid fa-mountain' },
      { display: 'Bay', value: 'bay', icon: 'fa-solid fa-water' },
      { display: 'Point of Interest', value: 'pointofInterest', icon: 'fa-solid fa-map-marker-alt' },
    ],
    accessPoint: [],
    structure: [
      { display: 'Building', value: 'building' },
      { display: 'Parking Lot', value: 'parkingLot' },
      { display: 'Boat Launch', value: 'boatLaunch' },
      { display: 'Yurt', value: 'yurt' },
    ],
    trail: []
  };

  public activityTypeOptions = [
    { display: 'Backcountry Camping', value: 'backcountryCamp' },
    { display: 'Frontcountry Camping', value: 'frontcountryCamp' },
    { display: 'Day Use', value: 'dayUse' },
    { display: 'Boating', value: 'boating' },
    { display: 'Canoe Circuit', value: 'canoeCircuit' },
  ];

  public activitySubTypeOptions = {
    backcountryCamping: [
      { display: 'Passport', value: 'passport' },
      { display: 'Reservation', value: 'reservation' },
      { display: 'Group', value: 'group' },
    ],
    frontcountryCamping: [],
    dayUse: [
      { display: 'Parking', value: 'parking' },
      { display: 'Trail Access', value: 'trailAccess' },
      { display: 'Picnic Shelter', value: 'picnicShelter' },
    ],
    boating: [],
    canoeCircuit: [
      { display: 'Full Circuit', value: 'fullCircuit' },
      { display: 'Partial Circuit', value: 'partialCircuit' },
    ]
  };

  constructor(
    protected searchService: SearchService,
    protected loadingService: LoadingService,
    protected cdr: ChangeDetectorRef,
    protected dataService: DataService
  ) {
    this._resultsSignal = this.dataService.watchItem(Constants.dataIds.SEARCH_RESULTS);
    this._passiveResultsSignal = this.dataService.watchItem(Constants.dataIds.PASSIVE_SEARCH_RESULTS);
    effect(() => {
      // combine passive and normal search results
      this.searchResults = this._resultsSignal()?.map((result) => {
        if (result?._source) {
          return result._source;
        }
        return result;
      }) || [];
      // Flag search results with resultType
      this.searchResults = this.searchResults.map((result) => {
        result['resultType'] = 'search';
        return result;
      });
      const passiveResults = this._passiveResultsSignal()?.map((result) => {
        if (result?._source) {
          return result._source;
        }
        return result;
      }) || [];
      this.mapResults = new Set([...passiveResults, ...this.searchResults]);
      this.updateMapMarkers();
    });
    effect(() => {
      if (this._resultsSignal() && this.searchResults?.length > 0) {
        this.mapComponent?.flyToFitBounds(this.searchResults?.map(result => result?.location), null);
      }
    });
  }

  ngOnInit() {
    this.form = new UntypedFormGroup({
      search: new UntypedFormControl(''),
      showFilters: new UntypedFormControl(false),
      filters: new UntypedFormGroup({
        schema: new UntypedFormControl(''),
        collectionId: new UntypedFormControl(''),
        orcs: new UntypedFormControl(''),
        facilityType: new UntypedFormControl(''),
        facilitySubType: new UntypedFormControl(''),
        activityType: new UntypedFormControl(''),
        activitySubType: new UntypedFormControl(''),
      })
    });
    this.form.get('showFilters').valueChanges.subscribe((showFilters) => {
      if (!showFilters) {
        this.resetFilters();
      }
    });
    this.form.get('filters.schema').valueChanges.subscribe(() => {
      this.resetFilters(true);
    });

  }

  updateMapMarkers() {
    if (this.mapResults?.size > 0) {
      const markers = [];
      for (const result of this.mapResults) {
        if (result?.location?.coordinates) {
          const options = this.generateMarkerOptions(result);
          markers.push({
            coordinates: [result.location.coordinates[0], result.location.coordinates[1]],
            options: {
              data: result,
              ...options
            }
          });
        }
      }
      this._markers.set(markers);
    } else {
      this._markers.set([]);
    }
    this.mapComponent?.updateMap();
  }

  generateMarkerOptions(data) {
    const schema = data?.schema || 'default';
    const options = this.markerSchemaOptions[schema] || this.markerSchemaOptions.default;
    const markerOptions = {
      color: options?.color,
      icon: options?.icon,
      z_index: data?.resultType === 'search' ? 900 : 500,
      draggable: false,
      element: this.generatePassiveResultEl(options, data)
    };
    return markerOptions;
  }

  ngAfterViewChecked(): void {
    // This is a workaround to ensure change detection runs after the view has been checked.
    // Missing this check seems to be a by-product of lazy loading.
    this.cdr.detectChanges();
  }

  resetFilters(schemaChange = false) {
    if (schemaChange) {
      const schemaChangeKeys = [
        'orcs',
        'facilityType',
        'facilitySubType',
        'activityType',
        'activitySubType'
      ];
      for (const key of schemaChangeKeys) {
        this.form.get(`filters.${key}`).reset();
      }
    }
    else {
      this.form.get('filters').reset();
    }
  }

  getFacilitySubTypeOptions() {
    const facilityType = this.form.get('filters.facilityType').value;
    return this.facilitySubTypeOptions[facilityType] || [];
  }

  getActivitySubTypeOptions() {
    const activityType = this.form.get('filters.activityType').value;
    return this.activitySubTypeOptions[activityType] || [];
  }

  async search() {
    const query = this.form.get('search').value;
    const filters = this.formatFilters();
    const searchValue = this.form.get('search');
    const res = await this.searchService.searchByQuery(query, filters);
    this.cdr.detectChanges();
  }

  formatFilters() {
    const filters = this.form.get('filters').value;
    for (const key in filters) {
      if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
        delete filters[key];
      }
    }
    if (filters?.collectionId) {
      switch (filters.schema) {
        case 'protectedArea':
          delete filters.collectionId;
          break;
        case 'geozone':
          filters['gzCollectionId'] = filters.collectionId;
          delete filters.collectionId;
          break;
        case 'facility':
          filters['fcCollectionId'] = filters.collectionId;
          delete filters.collectionId;
          break;
        case 'activity':
          filters['acCollectionId'] = filters.collectionId;
          delete filters.collectionId;
          break;
        default:
          delete filters.collectionId;
      }
    }
    // Remove empty filters
    return filters;
  }

  updateSearchBounds(bounds: any[]) {
    if (bounds && bounds.length === 2) {
      this.searchService.searchByQuery('', {
        bbox: bounds,
        size: 1000
      },
        null,
        true
      );
    }
  }

  toggleSearchFilters() {
    this.searchFiltersOpen = !this.searchFiltersOpen;
  }

  generatePassiveResultEl(options, data = null) {
    const el = document.createElement('div');
    el.style.backgroundColor = data?.resultType != 'search' ? 'gray' : options?.color;
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.setProperty("-webkit-filter", "drop-shadow(5px 5px 2px rgba(0, 0, 0, 0.5))");
    el.className = 'badge rounded-circle text-white p-2 d-flex align-items-center justify-content-center';
    const icon = el.appendChild(document.createElement('i'));
    icon.className = options?.icon + ' fa-2xl';
    if ((data?.schema) === 'facility' && data?.facilityType) {
      icon.className = this.facilityTypeOptions.find(f => f.value === data.facilityType)?.icon + ' fa-2xl' || options?.icon + ' fa-2xl';
      if (data?.facilitySubType) {
        const subType = this.facilitySubTypeOptions[data?.facilityType].find(f => f.value === data.facilitySubType);
        if (subType?.icon) {
          icon.className = subType.icon + ' fa-2xl';
        }
      }
    }
    return el;
  }

  onMarkerClick(event: any) {
    this.searchService.searchByQuery(``, {
      pk: event?.pk,
      sk: event?.sk,
    },
      {
        size: 1
      });
  }

  goToPark() {
    console.log('Go to park');
  }

  showAlerts() {
    console.log('Show alerts');
  }

  showClosures() {
    console.log('Show closures');
  }

  ngOnDestroy(): void {
    this.cdr.detectChanges();
    this.cdr.detach();
  };
}