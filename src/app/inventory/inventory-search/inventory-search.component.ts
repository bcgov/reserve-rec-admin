import { AfterViewChecked, ChangeDetectorRef, Component, ContentChildren, effect, ElementRef, OnChanges, OnDestroy, OnInit, signal, SimpleChanges, ViewChild, ViewContainerRef, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { SearchService } from '../../services/search.service';
import { LoadingService } from '../../services/loading.service';
import { SearchResultsTableComponent } from '../search-results-table/search-results-table.component';
import { MapComponent } from '../../map/map.component';
import { Constants } from '../../app.constants';
import { DataService } from '../../services/data.service';
import { MapMarkerComponent } from './map-marker/map-marker.component';

@Component({
  selector: 'app-inventory-search',
  imports: [CommonModule, NgdsFormsModule, SearchResultsTableComponent, MapComponent],
  templateUrl: './inventory-search.component.html',
  styleUrl: './inventory-search.component.scss'
})
export class InventorySearchComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  @ViewChild('markerRenderZone', { read: ViewContainerRef }) vcr!: ViewContainerRef;
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

  public activityTypeOptions = Object.values(Constants.activityTypes);

  constructor(
    protected searchService: SearchService,
    protected loadingService: LoadingService,
    protected cdr: ChangeDetectorRef,
    protected dataService: DataService,
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
      // Unfortunately this duplicates the searched results - TODO, find a better
      // way to differentiate search results from passive results
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

  onSearchReset() {
    this.form.reset();
    this.searchService.clearSearchResults();
  }

  async updateMapMarkers() {
    if (this.mapResults?.size > 0) {
      const markers = [];
      for (const result of this.mapResults) {
        if (result?.location?.coordinates) {
          const options = await this.generateMarkerOptions(result);
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

  async generateMarkerOptions(data) {
    const schema = data?.schema || 'default';
    let options = { ...this.markerSchemaOptions.default };
    if (data?.resultType === 'search') {
      options = this.markerSchemaOptions[schema] || this.markerSchemaOptions.default;
    }
    options['icon'] = this.getMarkerIcon(data);
    const markerOptions = {
      z_index: data?.resultType === 'search' ? 900 : 500,
      draggable: false,
      element: await this.generateMapMarkerHTML(options, data)
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
    return Object.entries(Constants.facilityTypes[facilityType].subtypes);
  }

  getActivitySubTypeOptions() {
    const activityType = this.form.get('filters.activityType').value;
    return Object.entries(Constants.activityTypes[activityType]?.subTypes || {}).map(([key, value]) => value);
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
        size: 100
      },
        null,
        true
      );
    }
  }

  toggleSearchFilters() {
    this.searchFiltersOpen = !this.searchFiltersOpen;
  }

  getMarkerIcon(data) {
    if (data?.schema !== 'facility') {
      return this.markerSchemaOptions[data?.schema]?.icon || this.markerSchemaOptions.default.icon;
    }
    if (data?.facilityType) {
      if (data?.facilitySubType) {
        const subType = Constants.facilityTypes[data?.facilityType]?.subTypes?.[data.facilitySubType]
        if (subType?.iconClass) {
          return subType.iconClass;
        }
      }
      // If no subType icon found, return the main facility type icon
      return Constants.facilityTypes[data?.facilityType]?.iconClass || this.markerSchemaOptions.default.icon;
    }
    return this.markerSchemaOptions.default.icon;
  }

  async generateMapMarkerHTML(options, data = null) {
    const el2 = this.vcr.createComponent(MapMarkerComponent);
    el2.setInput('markerData', data);
    el2.setInput('markerOptions', options);
    return await el2.instance.getTemplate();
  }

  async oldMapMarkerHTML(options, data = null) {
    const el = document.createElement('div');
    el.style.backgroundColor = data?.resultType != 'search' ? 'gray' : options?.color;
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.fontSize = '1rem';
    el.style.setProperty("-webkit-filter", "drop-shadow(5px 5px 2px rgba(0, 0, 0, 0.5))");
    if (data?.resultType === 'search') {
      el.style.width = '50px';
      el.style.height = '50px';
      el.style.fontSize = '2rem';

    }
    if (data?.imageUrl && data?.resultType === 'search') {
      const img = el.appendChild(document.createElement('img'));
      el.style.border = `2px solid ${options?.color}`;
      img.src = data.imageUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
    } else {
      const icon = el.appendChild(document.createElement('i'));
      el.className = 'badge rounded-circle text-white p-2 d-flex align-items-center justify-content-center';
      icon.className = options?.icon;
      if ((data?.schema) === 'facility' && data?.facilityType) {
        icon.className = this.facilityTypeOptions.find(f => f.value === data.facilityType)?.icon || options?.icon;
        if (data?.facilitySubType) {
          const subType = this.facilitySubTypeOptions[data?.facilityType].find(f => f.value === data.facilitySubType);
          if (subType?.icon) {
            icon.className = subType.icon;
          }
        }
      }
    }
    const tempElVals = {
      width: el.style.width,
      height: el.style.height,
      fontSize: el.style.fontSize,
      filter: el.style.getPropertyValue("-webkit-filter"),
      z_index: options?.z_index || 500
    };
    el.addEventListener('mouseenter', () => {
      el.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 4px rgba(0, 153, 255, 0.5))");
      el.style.width = '45px';
      el.style.height = '45px';
      el.style.fontSize = '1.5rem';
      el.style.zIndex = '900';
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty("-webkit-filter", tempElVals.filter);
      el.style.width = tempElVals.width;
      el.style.height = tempElVals.height;
      el.style.fontSize = tempElVals.fontSize;
      el.style.zIndex = String(tempElVals.z_index);
    });
    return el;
  }

  loadMore(event: any) {
    console.log('Load more:', event);

  }

  onMarkerClick(event: any) {
    this.searchService.searchByQuery(``, {
      _id: `${event?.pk}#${event?.sk}`,
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
