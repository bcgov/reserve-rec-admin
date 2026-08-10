import { Component, OnInit, Input, Output, EventEmitter, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs/operators';
import { CollectionSelectorComponent } from '../../../shared/components/collection-selector/collection-selector.component';
import { FacilityService } from '../../../services/facility.service';
import { ActivityService } from '../../../services/activity.service';
import { ProductService } from '../../../services/product.service';

interface DropdownOption {
  pk: string;
  displayName: string;
  [key: string]: any;
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
  imports: [CommonModule, CollectionSelectorComponent, ReactiveFormsModule],
  templateUrl: './capacity-filters.component.html',
  styleUrls: ['./capacity-filters.component.scss']
})
export class CapacityFiltersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  // Form
  filterForm!: FormGroup;

  // Dropdown options
  facilities: DropdownOption[] = [];
  products: DropdownOption[] = [];

  // Output events
  @Output() productSelected = new EventEmitter<ProductSelectionEvent>();
  @Output() collectionChanged = new EventEmitter<void>();

  constructor(
    protected facilityService: FacilityService,
    protected activityService: ActivityService,
    protected productService: ProductService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  private initializeForm() {
    this.filterForm = this.fb.group({
      collection: [''],
      facility: [''],
      product: ['']
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
    this.collectionControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.onCollectionChange());
    this.facilityControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.onFacilityChange());
    this.productControl.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.onProductChange());
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
    this.products = [];
    const selectedCollectionId = this.collectionControl.value;
    if (!selectedCollectionId) {
      return;
    }
    await this.loadFacilities(selectedCollectionId);
  }

  private async loadFacilities(collectionId: string) {
    try {
      const facilitiesData = await this.facilityService.getFacilitiesByCollectionId(collectionId);
      this.facilities = this.extractArrayFromResponse(facilitiesData);
    } catch (error) {
      this.facilities = [];
    }
  }

  async onFacilityChange() {
    this.productControl.setValue('', { emitEvent: false });
    this.products = [];
    const selectedFacilityId = this.facilityControl.value;
    if (!selectedFacilityId) {
      return;
    }
    await this.loadProducts(selectedFacilityId);
  }

  private async loadProducts(facilityId: string) {
    try {
      const collectionId = this.collectionControl.value;
      const activitiesData = await this.activityService.getActivitiesByCollectionId(collectionId);
      const activitiesArray = this.extractArrayFromResponse(activitiesData);
      if (!activitiesArray || activitiesArray.length === 0) {
        this.products = [];
        return;
      }
      const allProducts: DropdownOption[] = [];
      for (const activity of activitiesArray) {
        try {
          const productsData = await this.productService.getProductsByActivity(
            collectionId,
            activity.activityType,
            activity.activityId
          );
          if (productsData) {
            const productsArray = this.extractArrayFromResponse(productsData);
            allProducts.push(...productsArray);
          }
        } catch (error) {
          // Continue with next activity if one fails
        }
      }
      this.products = allProducts;
    } catch (error) {
      this.products = [];
    }
  }

  async onProductChange() {
    const selectedProductId = this.productControl.value;
    
    if (!selectedProductId) {
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

    // Find the selected product in the products array to get its metadata
    const selectedProduct = this.products.find(p => p.pk === selectedProductId);
    if (!selectedProduct) {
      return;
    }

    const collectionId = this.collectionControl.value;
    const activitiesData = await this.activityService.getActivitiesByCollectionId(collectionId);
    const activitiesArray = this.extractArrayFromResponse(activitiesData);
    const activity = activitiesArray.length > 0 ? activitiesArray[0] : null;
    const productId = this.extractProductId(selectedProductId);
    this.productSelected.emit({
      productId,
      productName: selectedProduct.displayName || '',
      rangeStart: selectedProduct['rangeStart'] || '',
      rangeEnd: selectedProduct['rangeEnd'] || '',
      activityType: activity?.activityType || '',
      activityId: activity?.activityId || '',
      collectionId: collectionId
    });
  }

  private extractProductId(productKey: string): string {
    return productKey.split('::')[productKey.split('::').length - 1];
  }
}
