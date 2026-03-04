import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Constants } from '../../../app.constants';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { PolicyListItemComponent } from '../../policy/policy-list-item/policy-list-item.component';
import { PolicyService } from '../../../services/policy.service';
import { ActivityService } from '../../../services/activity.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, DatePipe, ActivityListItemComponent, PolicyListItemComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
  providers: [BsModalService]
})
export class ProductDetailsComponent {
  public product: any = null;
  public location: any = null;
  public envelope: any = null;
  public _markers: WritableSignal<any[]> = signal([]);
  public _envelope: WritableSignal<any[]> = signal([]);
  public markerOptions = {
    color: 'goldenrod',
  };
  public envelopeOptions = {
    fillColor: 'goldenrod',
    fillOpacity: 0.5,
  };

  // Relationship data
  public relatedActivity: any[] = [];
  public relatedPolicies: any[] = [];
  public loadingRelationships: boolean = false;

  constructor(
    private activityService: ActivityService,
    private policyService: PolicyService,
    private route: ActivatedRoute,
  ) {
    // Subscribe to route data changes to handle updates
    this.route.data.subscribe(async (data) => {
      if (data?.['product']) {
        this.product = data['product'];
        await this.loadRelationships();
      }
    });
  }

  getActivityTypeOption() {
    return Constants.activityTypes[this.product?.activityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getActivitySubTypeOption() {
    return Constants.activityTypes[this.product?.activityType]?.subTypes?.[this.product?.activitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  stringifyData(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  // Load relationships for the current product
  async loadRelationships() {
    if (!this.product?.pk || !this.product?.sk) {
      console.warn('Cannot load relationships: Activity missing pk or sk');
      return;
    }

    this.loadingRelationships = true;

    try {
      await this.loadActivityRelationships();
      await this.loadPolicyRelationships();
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      this.loadingRelationships = false;
    }
  }

  // Load and fetch activity entity that is related to this product based on collectionId, activityType, and activityId
  async loadActivityRelationships() {
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
}
