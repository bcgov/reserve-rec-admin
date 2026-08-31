import { Component, OnInit, Input, Output, EventEmitter, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { CollectionService } from '../../../services/collection.service';
import { FacilityService } from '../../../services/facility.service';
import { ActivityService } from '../../../services/activity.service';
import { ProductService } from '../../../services/product.service';
import { RelationshipService } from '../../../services/relationship.service';
import { DataService } from '../../../services/data.service';
import { Constants } from '../../../app.constants';

interface DropdownOption {
  pk: string;
  displayName: string;
  [key: string]: any;
}

interface CollectionDropdownOption {
  display: string;
  value: string;
}

interface ProductSelectionEvent {
  productId: string;
  productName: string;
  rangeStart: string;
  rangeEnd: string;
  activityType: string;
  activityId: string;
  collectionId: string;
}

@Component({
  selector: 'app-capacity-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './capacity-filters.component.html',
  styleUrls: ['./capacity-filters.component.scss']
})
export class CapacityFiltersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  // Form
  filterForm!: FormGroup;

  // Dropdown options
  collections: CollectionDropdownOption[] = [];
  facilities: DropdownOption[] = [];
  products: DropdownOption[] = [];
  private facilitiesMap: Map<string, any> = new Map(); // Map to store facilities by pk
  private productsMap: Map<string, any> = new Map(); // Map to store products by pk::sk

  // Output events
  @Output() productSelected = new EventEmitter<ProductSelectionEvent>();
  @Output() collectionChanged = new EventEmitter<void>();
  @Output() facilityChanged = new EventEmitter<void>();

  constructor(
    protected collectionService: CollectionService,
    protected facilityService: FacilityService,
    protected activityService: ActivityService,
    protected productService: ProductService,
    protected relationshipService: RelationshipService,
    protected dataService: DataService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  private initializeForm() {
    this.filterForm = this.fb.group({
      collection: [''],
      facility: [{ value: '', disabled: true }],
      product: [{ value: '', disabled: true }]
    });
  }

  get collectionControl(): FormControl {
    return this.filterForm.get('collection') as FormControl;
  }

  get facilityControl(): FormControl {
    return this.filterForm.get('facility') as FormControl;
  }

  get productControl(): FormControl {
    return this.filterForm.get('product') as FormControl;
  }

  ngOnInit() {
    this.loadCollections();
    this.collectionControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {this.onCollectionChange();});
    this.facilityControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {this.onFacilityChange();});
    this.productControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {this.onProductChange();});
  }

  private async loadCollections() {
    try {
      // Try cache first
      const cached = this.dataService.getItemValue(Constants.dataIds.COLLECTIONS_RESULT);
      if (cached?.items?.length) {
        this.collections = this.mapCollectionsToOptions(cached.items);
        return;
      }
      
      const res = await this.collectionService.getAllCollections();
      this.collections = this.mapCollectionsToOptions(res?.items ?? []);
    } catch (error) {
      console.error('Error loading collections:', error);
      this.collections = [];
    }
  }

  private mapCollectionsToOptions(collections: any[]): CollectionDropdownOption[] {
    return collections
      .filter(c => c.isVisible !== false)
      .map(c => ({
        display: c.displayName ? `${c.displayName} (${c.collectionId})` : c.collectionId,
        value: c.collectionId,
      }));
  }

  private extractArrayFromResponse(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    return Array.isArray(data?.items) ? data.items : [];
  }

  async onCollectionChange() {
    this.collectionChanged.emit();
    this.facilityControl.setValue('', { emitEvent: false });
    this.productControl.setValue('', { emitEvent: false });
    this.facilities = [];
    this.facilitiesMap.clear();
    this.products = [];
    this.productsMap.clear();
    const selectedCollectionId = this.collectionControl.value;
    if (!selectedCollectionId) {
      this.facilityControl.disable({ emitEvent: false });
      this.productControl.disable({ emitEvent: false });
      return;
    }
    // Enable facility control when collection is selected
    this.facilityControl.enable({ emitEvent: false });
    await this.loadFacilities(selectedCollectionId);
  }

  private async loadFacilities(collectionId: string) {
    try {
      const facilitiesData = await this.facilityService.getFacilitiesByCollectionId(collectionId);
      this.facilities = this.extractArrayFromResponse(facilitiesData);
      
      // Populate the facilities map for quick lookup by composite key (pk::sk)
      this.facilitiesMap.clear();
      for (const facility of this.facilities) {
        const compositeKey = `${facility['pk']}::${facility['sk']}`;
        this.facilitiesMap.set(compositeKey, facility);
      }
    } catch (error) {
      this.facilities = [];
      this.facilitiesMap.clear();
    }
  }

  async onFacilityChange() {
    this.facilityChanged.emit();
    this.productControl.setValue('', { emitEvent: false });
    this.products = [];
    this.productsMap.clear();
    const selectedFacilityId = this.facilityControl.value;
    if (!selectedFacilityId) {
      this.productControl.disable({ emitEvent: false });
      return;
    }
    // Enable product control when facility is selected
    this.productControl.enable({ emitEvent: false });
    await this.loadProducts(selectedFacilityId);
  }

  private async loadProducts(facilityId: string) {
    try {
      const collectionId = this.collectionControl.value;
      
      // Get the facility object from map using composite key
      const selectedFacility = this.facilitiesMap.get(facilityId);
      if (!selectedFacility) {
        console.warn('Selected facility not found in facilities map:', facilityId);
        this.products = [];
        return;
      }

      // Get activities that are specifically related to this facility
      // (not all activities in the collection)
      const activitiesData = await this.relationshipService.getRelationshipsFrom(
        selectedFacility.pk,
        selectedFacility.sk,
        'activity', // target schema filter
        true, // expand entities to get full activity data
        false
      );

      if (!activitiesData || activitiesData.length === 0) {
        this.products = [];
        return;
      }

      // Extract activity entities from the relationship response
      const activitiesArray = activitiesData
        .map((rel: any) => rel.entity)
        .filter((entity: any) => entity !== null);

      if (activitiesArray.length === 0) {
        this.products = [];
        return;
      }

      const allProducts: DropdownOption[] = [];
      this.productsMap.clear();
      for (const activity of activitiesArray) {
        try {
          const productsData = await this.productService.getProductsByActivity(
            collectionId,
            activity.activityType,
            activity.activityId
          );
          if (productsData) {
            const productsArray = this.extractArrayFromResponse(productsData);
            const productsWithActivity = productsArray.map(product => ({
              ...product,
              activityType: activity.activityType,
              activityId: activity.activityId,
            }));
            allProducts.push(...productsWithActivity);
            
            // Populate products map with composite key for fast lookup
            productsWithActivity.forEach(product => {
              const compositeKey = `${product.pk}::${product.sk}`;
              this.productsMap.set(compositeKey, product);
            });
          }
        } catch (error) {
          // Continue with next activity if one fails
        }
      }
      this.products = allProducts;
    } catch (error) {
      console.error('Error loading products:', error);
      this.products = [];
    }
  }

  async onProductChange() {
    const selectedValue = this.productControl.value;
    if (!selectedValue) {
      this.productSelected.emit({
        productId: '',
        productName: '',
        rangeStart: '',
        rangeEnd: '',
        activityType: '',
        activityId: '',
        collectionId: ''
      });
      return;
    }

    // Get product from map using composite key for O(1) lookup
    const selectedProduct = this.productsMap.get(selectedValue);
    if (!selectedProduct) {
      console.warn('Selected product not found in products map');
      return;
    }

    const collectionId = this.collectionControl.value;
    const productId = selectedProduct['productId'] || selectedProduct['sk'];   
    this.productSelected.emit({
      productId: String(productId),
      productName: selectedProduct['displayName'] || '',
      rangeStart: selectedProduct['rangeStart'] || '',
      rangeEnd: selectedProduct['rangeEnd'] || '',
      activityType: selectedProduct['activityType'] || '',
      activityId: selectedProduct['activityId'] || '',
      collectionId: collectionId
    });
  }
}
