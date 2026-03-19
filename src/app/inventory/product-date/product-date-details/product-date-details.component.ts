import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductDateService } from '../../../services/product-date.service';
import { ProductService } from '../../../services/product.service';
import { ActivityService } from '../../../services/activity.service';

@Component({
  selector: 'app-product-date-details',
  imports: [CommonModule],
  templateUrl: './product-date-details.component.html',
  styleUrl: './product-date-details.component.scss'
})
export class ProductDateDetailsComponent {
  public productDate: any = null;
  public loading: boolean = true;
  public error: string | null = null;

  public collectionId: string;
  public activityType: string;
  public activityId: string;
  public productId: string;
  public date: string;

  public productName: string | null = null;
  public activityName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productDateService: ProductDateService,
    private productService: ProductService,
    private activityService: ActivityService
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
      }
      this.productName = product?.displayName || null;
      this.activityName = activity?.displayName || null;
    } catch (err) {
      this.error = 'Failed to load product date.';
    } finally {
      this.loading = false;
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

  get temporalWindowsList(): any[] {
    const windows = this.productDate?.reservationContext?.temporalWindows;
    if (!windows) return [];
    return Object.values(windows);
  }
}
