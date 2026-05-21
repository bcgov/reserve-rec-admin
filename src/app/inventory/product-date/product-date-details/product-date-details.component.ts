import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, UntypedFormGroup, Validators } from '@angular/forms';
import { ProductDateService } from '../../../services/product-date.service';
import { ProductService } from '../../../services/product.service';
import { ActivityService } from '../../../services/activity.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-product-date-details',
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent],
  templateUrl: './product-date-details.component.html',
  styleUrl: './product-date-details.component.scss'
})
export class ProductDateDetailsComponent {
  public productDate: any = null;
  public loading: boolean = true;
  public error: string | null = null;
  public saving: boolean = false;
  public isEditing: boolean = false;

  public collectionId: string;
  public activityType: string;
  public activityId: string;
  public productId: string;
  public date: string;

  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
    ];
    if (this.productName && this.collectionId && this.activityType && this.activityId && this.productId) {
      items.push({
        label: this.productName,
        link: [`/inventory/product/${this.collectionId}/${this.activityType}/${this.activityId}/${this.productId}`],
      });
    }
    items.push({ label: this.date || 'Product date' });
    return items;
  }

  public productName: string | null = null;
  public activityName: string | null = null;
  public editForm: UntypedFormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productDateService: ProductDateService,
    private productService: ProductService,
    private activityService: ActivityService,
    private fb: FormBuilder
  ) {
    this.route.params.subscribe(async (params) => {
      this.collectionId = params['collectionId'];
      this.activityType = params['activityType'];
      this.activityId = params['activityId'];
      this.productId = params['productId'];
      this.date = params['date'];
      await this.loadProductDate();
    });
  }

  async loadProductDate() {
    this.loading = true;
    this.error = null;
    try {
      const [productDateRes, product, activity] = await Promise.all([
        this.productDateService.getProductDates(
          this.collectionId, this.activityType, this.activityId, this.productId, this.date, this.date
        ),
        this.productService.getProduct(this.collectionId, this.activityType, this.activityId, this.productId),
        this.activityService.getActivity(this.collectionId, this.activityType, this.activityId)
      ]);
      // runQuery returns { items: [], lastEvaluatedKey }
      const dates = productDateRes?.items ?? (Array.isArray(productDateRes) ? productDateRes : (productDateRes ? [productDateRes] : []));
      this.productDate = dates.find(pd => pd.sk === this.date) || dates[0] || null;
      if (!this.productDate) {
        this.error = `No product date found for ${this.date}.`;
      } else {
        this.initializeForm();
      }
      this.productName = product?.displayName || null;
      this.activityName = activity?.displayName || null;
    } catch (err) {
      this.error = 'Failed to load product date.';
    } finally {
      this.loading = false;
    }
  }

  private initializeForm() {
    const assets = this.productDate?.assetList || [];
    const group: any = {};

    // Create form controls for each asset's quantity
    assets.forEach((asset: any, index: number) => {
      const controlName = `asset_${index}_quantity`;
      group[controlName] = [asset.quantity ?? 0, [Validators.required, Validators.min(0)]];
    });

    this.editForm = this.fb.group(group);
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.initializeForm();
    }
  }

  async saveChanges() {
    if (!this.editForm || this.editForm.invalid) {
      console.error('Form is invalid');
      return;
    }

    this.saving = true;
    try {
      const formValue = this.editForm.value;
      const updatedAssets = (this.productDate?.assetList || []).map((asset: any, index: number) => ({
        ...asset,
        quantity: formValue[`asset_${index}_quantity`] ?? asset.quantity
      }));

      const updatedProductDate = {
        ...this.productDate,
        assetList: updatedAssets
      };

      // Update the product date with new asset quantities
      await this.productDateService.updateProductDate(
        this.collectionId,
        this.activityType,
        this.activityId,
        this.productId,
        this.date,
        updatedProductDate
      );

      // Update the inventory pools for each asset
      await this.productDateService.updateInventoryPools(
        this.collectionId,
        this.activityType,
        this.activityId,
        this.productId,
        this.date,
        updatedAssets
      );

      this.productDate = updatedProductDate;
      this.isEditing = false;
      console.log('ProductDate and InventoryPools saved successfully');
    } catch (error) {
      console.error('Error saving product date:', error);
      this.error = 'Failed to save changes';
    } finally {
      this.saving = false;
    }
  }

  goBack() {
    this.router.navigate([
      '/inventory/product',
      this.collectionId,
      this.activityType,
      this.activityId,
      this.productId
    ]);
  }

  get reservationContext() {
    return this.productDate?.reservationContext;
  }

  getPolicyDetails(policy: any): { key: string; value: any }[] {
    if (!policy) return [];
    
    return Object.entries(policy)
      .filter(([key]) => key !== 'primaryKey') // Skip internal keys
      .map(([key, value]) => ({
        key: this.formatKey(key),
        value: value
      }));
  }

  getReservationPolicyDetails(): { key: string; value: any }[] {
    const policy = this.productDate?.reservationPolicy;
    const details: { key: string; value: any }[] = [];

    // Add pk and sk at the top
    if (this.productDate?.pk) {
      details.push({ key: 'Primary Key (pk)', value: this.productDate.pk });
    }
    if (this.productDate?.sk) {
      details.push({ key: 'Sort Key (sk)', value: this.productDate.sk });
    }

    if (!policy) return details;
    
    const policyDetails = Object.entries(policy)
      .map(([key, value]) => ({
        key: this.formatKey(key),
        value: value
      }));

    return [...details, ...policyDetails];
  }

  private formatKey(key: string): string {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return `[${value.length} items]`;
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  get temporalWindowsList(): any[] {
    const windows = this.productDate?.reservationContext?.temporalWindows;
    if (!windows) return [];
    return Object.values(windows);
  }
}
