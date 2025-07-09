import { AfterViewChecked, ChangeDetectorRef, Component, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { SearchService } from '../services/search.service';
import { LoadingService } from '../services/loading.service';
import { SearchResultsTableComponent } from './search-results-table/search-results-table.component';

@Component({
  selector: 'app-inventory-component',
  imports: [CommonModule, NgdsFormsModule, SearchResultsTableComponent],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit, OnDestroy, AfterViewChecked {
  public form;

  public schemaOptions = [
    { display: 'Protected Area', value: 'protectedArea' },
    { display: 'Geozone', value: 'geozone' },
    { display: 'Facility', value: 'facility' },
    { display: 'Activity', value: 'activity' },
    { display: 'Product', value: 'product', disabled: true },
    { display: 'Policy', value: 'policy', disabled: true }
  ];

  public facilityTypeOptions = [
    { display: 'Campground', value: 'campground' },
    { display: 'Natural Feature', value: 'naturalFeature' },
    { display: 'Access Point', value: 'accessPoint' },
    { display: 'Structure', value: 'structure' },
    { display: 'Trail', value: 'trail' },
  ];

  public facilitySubTypeOptions = {
    campground: [],
    naturalFeature: [
      { display: 'Waterfall', value: 'waterfall' },
      { display: 'Lake', value: 'lake' },
      { display: 'River', value: 'river' },
      { display: 'Summit', value: 'summit' },
      { display: 'Bay', value: 'bay' },
      { display: 'Point of Interest', value: 'pointofInterest' },
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
    protected cdr: ChangeDetectorRef
  ) {

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