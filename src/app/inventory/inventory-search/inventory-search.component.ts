import { ChangeDetectorRef, Component, computed, ContentChildren, effect, ElementRef, OnChanges, OnDestroy, OnInit, signal, Signal, SimpleChanges, ViewChild, ViewContainerRef, WritableSignal } from '@angular/core';
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
export class InventorySearchComponent implements OnInit, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  @ViewChild('markerRenderZone', { read: ViewContainerRef }) vcr!: ViewContainerRef;
  @ViewChild('searchOverlay') searchOverlay!: ElementRef; // Adjust type as necessary
  public form;
  // Computed (not a plain field mutated inside an effect) so the template's
  // @if/results panel sees every update through Angular's normal signal-read
  // tracking instead of a plain field written from outside the zone, which
  // could leave the panel stuck showing stale results indefinitely.
  public searchResults: Signal<any[]> = computed(() => (this._resultsSignal()?.map((result) => {
    const doc = result?._source ? result._source : result;
    return { ...doc, resultType: 'search' };
  }) || []));
  public suggestions = [];
  public showSuggestions = false;
  private suggestionTimeout: any = null;
  public mapResults: Set<any> = new Set();
  public _markers: WritableSignal<any[]> = signal([]);
  public _resultsSignal: WritableSignal<any[]> = signal([]);
  public _passiveResultsSignal: WritableSignal<any[]> = signal([]);
  public searchChangeFlag = false; // Flag to indicate if search results have changed
  public searchFiltersOpen = false; // Flag to indicate if search filters are open

  public markerSchemaOptions = {
    collection: {
      color: '#23a93b',
      icon: 'fa-solid fa-folder'
    },
    geozone: {
      color: '#F8BB47',
      icon: 'fa-solid fa-map-location-dot'
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
    { display: 'Collection', value: 'collection' },
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
      { display: 'Lake', value: 'lake', iconClass: 'fa-solid fa-water' },
      { display: 'Summit', value: 'summit', iconClass: 'fa-solid fa-mountain' },
      { display: 'Point of Interest', value: 'pointOfInterest', iconClass: 'fa-solid fa-map-marker-alt' },
      { display: 'Bay', value: 'bay', iconClass: 'fa-solid fa-water' },
      { display: 'River', value: 'river', iconClass: 'fa-solid fa-water' },
      { display: 'Beach', value: 'beach', iconClass: 'fa-solid fa-umbrella-beach' }
    ],
    accessPoint: [],
    structure: [
      { display: 'Parking Lot', value: 'parkingLot', iconClass: 'fa-solid fa-square-parking' },
      { display: 'Boat Launch', value: 'boatLaunch', iconClass: 'fa-solid fa-sailboat' },
      { display: 'Yurt', value: 'yurt', iconClass: 'fa-solid fa-tent' },
      { display: 'Building', value: 'building', iconClass: 'fa-solid fa-building' },
      { display: 'Cabin', value: 'cabin', iconClass: 'fa-solid fa-house' }
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
      const passiveResults = this._passiveResultsSignal()?.map((result) => {
        if (result?._source) {
          return result._source;
        }
        return result;
      }) || [];
      this.mapResults = new Set([...passiveResults, ...this.searchResults()]);
      this.updateMapMarkers();
      // effect() callbacks run outside Angular's zone, so nothing guarantees
      // a zone-triggered change detection pass runs afterwards. Without
      // forcing one here, the @if-gated results panel can sit showing stale
      // results indefinitely even though searchResults() already
      // updated (#346).
      this.cdr.detectChanges();
    });
    effect(() => {
      const searchResults = this.searchResults();
      if (this._resultsSignal() && searchResults?.length > 0) {
        this.mapComponent?.flyToFitBounds(searchResults?.map(result => result?.location), null);
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
    const facilityType = this.form.get('filters.facilityType')?.value;
    // Note: Constants uses camelCase `subTypes`. The previous lowercase
    // access (`.subtypes`) returned undefined, and Object.entries(undefined)
    // throws — this fired during change detection if a facility-type filter
    // was set, leaving the page stuck behind the loading overlay.
    return Object.entries(Constants.facilityTypes[facilityType]?.subTypes || {});
  }

  getActivitySubTypeOptions() {
    const activityType = this.form.get('filters.activityType').value;
    return Object.entries(Constants.activityTypes[activityType]?.subTypes || {}).map(([key, value]) => value);
  }

  /**
   * Handles input changes in the search box for autocomplete
   * Debounced to avoid excessive API calls
   */
  async onSearchInput(event: any) {
    const query = event?.target?.value || this.form.get('search').value;
    
    // Clear any existing timeout
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }
    
    // Hide suggestions if query is too short
    if (!query || query.length < 2) {
      this.showSuggestions = false;
      this.suggestions = [];
      return;
    }

    // Wait 500ms after user stops typing before fetching suggestions
    this.suggestionTimeout = setTimeout(async () => {
      try {
        const filters = this.formatFilters();

        this.suggestions = await this.searchService.getSuggestions(query, {
          field: 'searchTerms.suggest',
          size: 8,
          fuzzy: true,
          fuzziness: 'AUTO',
          filters: filters
        });
        this.showSuggestions = this.suggestions.length > 0;
        console.log('Suggestions:', this.suggestions);
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }, 500); // 500ms delay
  }

  // Handles selecting a suggestion from the autocomplete dropdown
  selectSuggestion(suggestion: any) {
    // Set the search input to the selected suggestion
    this.form.get('search').setValue(suggestion.text);
    this.showSuggestions = false;
    
    // Optionally trigger a search immediately
    this.search();
  }

  
  // Hides suggestions dropdown (e.g., when clicking outside)
  hideSuggestions() {
    // Small delay to allow click events on suggestions to fire first
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  async search() {
    const query = this.form.get('search').value;
    const filters = this.formatFilters();
    
    // Hide suggestions when searching
    this.showSuggestions = false;
    
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

    // Remove empty filters
    return filters;
  }

  updateSearchBounds(bounds: any[]) {
    if (bounds && bounds.length === 2) {
      this.searchService.searchByQuery('', {
        bbox: bounds,
        size: 25
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
    if (!this.vcr) {
      return this.oldMapMarkerHTML(options, data);
    }
    // The returned element gets handed to maplibre-gl, which reparents it
    // into its own marker layer via native appendChild — bypassing Angular's
    // renderer entirely. If we hand over the live component's own node,
    // Angular permanently loses track of it: destroying the component later
    // can't remove a node maplibre has since moved elsewhere. That leak was
    // corrupting this component's view tree and made an unrelated sibling
    // (the search results panel) get stuck rendering stale/duplicate content
    // on every marker click (#346).
    //
    // Fix: render through the real component as before (so markers look
    // identical), but hand maplibre a detached *clone* of its DOM instead of
    // the live node, then destroy the component. maplibre is free to move
    // the clone anywhere since Angular never owned it.
    //
    // destroy() alone isn't enough here: it correctly marks the component's
    // view as destroyed (hostView.destroyed === true) but leaves the host
    // element itself still attached to the document — verified directly,
    // not assumed. So remove it ourselves too, rather than trust destroy()
    // to have taken the node with it.
    const el2 = this.vcr.createComponent(MapMarkerComponent);
    el2.setInput('markerData', data);
    el2.setInput('markerOptions', options);
    const template = await el2.instance.getTemplate();
    const clone = template.cloneNode(true) as HTMLElement;
    // destroy() removes the component's encapsulated .circle-marker
    // stylesheet once it's the last live instance of this component type —
    // the clone's classes then point at nothing, so the marker image
    // rendered full-size/unclipped across the map instead of as a small
    // circle. Bake the sizing inline on the clone so it doesn't depend on
    // that stylesheet still being in the document.
    const circle = clone.querySelector<HTMLElement>('.circle-marker');
    if (circle) {
      // 30px base size, matching the .circle-marker SCSS. The "bigger for
      // search results" look comes entirely from the ngStyle scale(1.5)
      // transform the component already applied inline (and which survives
      // the clone) — setting a bigger base size here too would compound
      // with that transform and make search markers oversized.
      circle.style.width = '30px';
      circle.style.height = '30px';
      circle.style.borderRadius = '50%';
      circle.style.borderWidth = '2px';
      circle.style.borderStyle = 'solid';
      circle.style.overflow = 'hidden';
      circle.style.display = 'flex';
      circle.style.alignItems = 'center';
      circle.style.justifyContent = 'center';
    }
    el2.destroy();
    el2.location.nativeElement.remove();
    return clone;
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
    // Clean up the timeout to prevent memory leaks
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }
    this.cdr.detectChanges();
    this.cdr.detach();
  };
}
