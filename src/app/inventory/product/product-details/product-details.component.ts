import { ChangeDetectorRef, Component, signal, ViewChild, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { PolicyListItemComponent } from '../../policy/policy-list-item/policy-list-item.component';
import { ActivityService } from '../../../services/activity.service';
import { PolicyService } from '../../../services/policy.service';
import { ProductService } from '../../../services/product.service';
import { ProductDateService } from '../../../services/product-date.service';
import { PermissionDirective } from '../../../shared/directives/permission.directive';

@Component({
  selector: 'app-product-details',
  imports: [DatePipe, CommonModule, ActivityListItemComponent, PolicyListItemComponent, PermissionDirective],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss'
})
export class ProductDetailsComponent {
  public product;
  public _markers: WritableSignal<any[]> = signal([]);
  public markerOptions = {
    color: '#003366',
  };

  public relatedActivity: any[] = [];
  public relatedPolicies: any[] = [];
  public loadingRelationships: boolean = false;
  public productDates: any[] = [];
  public loadingProductDates: boolean = false;
  public currentWeekStart: Date = new Date();

  get currentWeekEnd(): Date {
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }

  get weekLabel(): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${this.currentWeekStart.toLocaleDateString('en-CA', opts)} – ${this.currentWeekEnd.toLocaleDateString('en-CA', opts)}`;
  }
  get weekDays(): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  getProductDateForDay(date: Date): any {
    return this.productDates.find(pd => pd.sk === this.toLocalISODate(date)) || null;
  }

  constructor(
    protected router: Router,
    private sanitizer: DomSanitizer,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    private activityService: ActivityService,
    private policyService: PolicyService,
    private productService: ProductService,
    private productDateService: ProductDateService
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe(async (data) => {
      if (data?.['product']) {
        this.product = data['product'];
        // Start week navigator on the Monday of the product's rangeStart week
        if (this.product?.rangeStart) {
          this.currentWeekStart = this.snapToMonday(new Date(this.product.rangeStart + 'T00:00:00'));
        } else {
          this.currentWeekStart = this.snapToMonday(new Date());
        }
        await this.loadRelationships();
        await this.loadProductDatesForWeek();
      }
    });
  }

  get safeAgreements(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.product?.agreements || '');
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }



  // updateMarkers() {
  //   if (this.product?.location?.coordinates) {
  //     const coordinates = this.product.location.coordinates;
  //     if (coordinates && coordinates?.length === 2) {
  //       this._markers.set([{
  //         coordinates: [coordinates[0], coordinates[1]],
  //         options: this.markerOptions
  //       }]);
  //     }
  //     this.mapComponent?.flyToFitBounds(
  //       [{coordinates: coordinates}],);
  //   }
  // }

  /**
   * Load relationships for the current product
   * Fetches activity and geozone relationships from the relationships endpoint
   */
  async loadRelationships() {
    if (!this.product?.pk || !this.product?.sk) {
      console.warn('Cannot load relationships: Product missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      // Fetch activity relationships
      await this.loadActivityRelationship();
      await this.loadPolicyRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }

  /**
   * Load and fetch activity entities that are tied to this product
   */
  async loadActivityRelationship() {
    try {
      const activity = await this.activityService.getActivity(this.product.collectionId, this.product.activityType, this.product.activityId);

      if (activity) {
        console.log(`Found ${activity.length} activity`);
        this.relatedActivity = activity;
      } else {
        console.log('No activity found');
        this.relatedActivity = null;
      }

    } catch (error) {
      console.error('Error loading activities relationships:', error);
      this.relatedActivity = null;
    }
  }

  // Load and fetch policies - uses the product pk and sk to fetch policies related to the product from the policies endpoint
  async loadPolicyRelationships() {
    try {
      const productPolicies = await this.policyService.getPoliciesByProduct(this.product.pk, this.product.sk)

      if (productPolicies?.length > 0) {
        console.log(`Found ${productPolicies.length} policies`);
        this.relatedPolicies = productPolicies;
      } else {
        console.log('No policies relationships found');
        this.relatedPolicies = [];
      }
    } catch (error) {
      console.error('Error loading policies relationships:', error);
      this.relatedPolicies = [];
    }
  }

  async loadProductDatesForWeek() {
    const { collectionId, activityType, activityId, productId } = this.product || {};
    if (!collectionId || !activityType || !activityId || !productId) return;
    this.loadingProductDates = true;
    try {
      const res = await this.productDateService.getProductDates(
        collectionId, activityType, activityId, productId,
        this.toLocalISODate(this.currentWeekStart),
        this.toLocalISODate(this.currentWeekEnd)
      );
      // runQuery returns { items: [], lastEvaluatedKey }
      this.productDates = res?.items ?? (Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Error loading product dates:', error);
      this.productDates = [];
    } finally {
      this.loadingProductDates = false;
      this.cdr.detectChanges();
    }
  }

  previousWeek() {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.loadProductDatesForWeek();
  }

  nextWeek() {
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.loadProductDatesForWeek();
  }

  // We may need to add some more info to be passed into product date at this point
  navigateToProductDate(date: Date) {
    const iso = this.toLocalISODate(date);
    this.router.navigate([
      '/inventory/product-date',
      this.product.collectionId,
      this.product.activityType,
      this.product.activityId,
      this.product.productId,
      iso
    ]);
  }

  /**
   * Initialize ProductDates for this product
   * Creates ProductDate and AvailabilitySignal records for each day in the product's date range
   */
  async initializeProductDates() {
    if (!this.product?.collectionId || !this.product?.activityType || !this.product?.activityId || !this.product?.productId) {
      console.error('Cannot initialize product dates: Missing product identifiers');
      return;
    }

    try {
      const result = await this.productService.createProductDates(
        this.product.collectionId,
        this.product.activityType,
        this.product.activityId,
        this.product.productId,
        {} // Empty body to use product's default rangeStart/rangeEnd
      );

      if (result) {
        console.log('Successfully initialized product dates:', result);
      }
    } catch (error) {
      console.error('Error initializing product dates:', error);
    }
  }

  /**
   * Load and fetch geozone entities that are related to this activity
   */
  // async loadGeozoneRelationships() {
  //   try {
  //     // Get geozone relationships for this activity with entity data expanded
  //     const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
  //       this.product.pk,
  //       this.product.sk,
  //       'geozone', // target schema filter
  //       true, // expand entities
  //       true  // bidirectional
  //     );

  //     if (relationshipsResponse?.length > 0) {
  //       console.log(`Found ${relationshipsResponse.length} geozone relationships`);
        
  //       // Extract the entity data directly from expanded relationships
  //       this.relatedGeozones = relationshipsResponse
  //         .map((rel: any) => rel.entity)
  //         .filter((entity: any) => entity !== null);
        
  //       console.log(`Loaded ${this.relatedGeozones.length} geozones`);
  //     } else {
  //       console.log('No geozone relationships found');
  //       this.relatedGeozones = [];
  //     }
  //   } catch (error) {
  //     console.error('Error loading geozone relationships:', error);
  //     this.relatedGeozones = [];
  //   }
  // }

  // Uses local date parts to avoid UTC offset shifting the date (toISOString() converts to UTC)
  private toLocalISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private snapToMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }
}
