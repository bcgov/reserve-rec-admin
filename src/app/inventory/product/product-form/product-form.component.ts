import { ChangeDetectorRef, Component, EventEmitter, Output, Input, OnInit, ViewChild } from '@angular/core';
import { Constants } from '../../../app.constants';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, AbstractControl, UntypedFormGroup, ReactiveFormsModule } from '@angular/forms';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { PolicyService } from '../../../services/policy.service';
import { ActivityService } from '../../../services/activity.service';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { PolicyListItemComponent } from '../../policy/policy-list-item/policy-list-item.component';
import { PermissionDirective } from '../../../shared/directives/permission.directive';
import { CollectionSelectorComponent } from '../../../shared/components/collection-selector/collection-selector.component';

@Component({
  selector: 'app-product-form',
  imports: [
    CommonModule,
    NgdsFormsModule,
    ReactiveFormsModule,
    SearchTermsComponent,
    CollectionSelectorComponent,
    ActivityListItemComponent,
    PolicyListItemComponent,
    LoadalComponent,
    PermissionDirective
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  @Input() isEditing: boolean = false;
  @Input() isCreating: boolean = false;
  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;

  public form;
  public product;
  
  public timezones = Constants.timezones;
  public availableActivities = [];
  public selectedPolicies: any[] = [];
  private initialPolicies: any[] = [];
  private allAvailablePolicies: any[] = [];
  public policies: { display: string, value: any }[] = [];
  public relatedActivity: any[] = [];

  constructor(
    protected cdr: ChangeDetectorRef,
    protected policyService: PolicyService,
    protected activityService: ActivityService,
    protected route: ActivatedRoute,
    private fb: FormBuilder,
  ) {
    if (this.route?.parent?.snapshot?.data?.['product']) {
      this.product = this.route.parent.snapshot.data['product'];
    }
    this.initializeForm();
  }

  ngOnInit() {
    if (!this.isCreating) {
      this.form.get('activity')?.clearValidators();
      this.form.get('activity')?.updateValueAndValidity({ emitEvent: false });
    }

    // We load available policies every time
    this.loadAvailablePolicies();

    if (this.product?.pk && this.product?.sk) {
      // Editing a product: load related activity entities
      this.loadActivityRelationships();
      if (!this.isCreating) {
        // Editing a product: load existing policies tied to this product
        this.loadExistingPolicies();
      }
    }
  }

  private initializeForm() {
    this.form = this.fb.group({
      activity: [this.product?.activity, {
        nonNullable: true,
        validators: [Validators.required]
      }],
      activityId: [this.product?.activityId || '', [Validators.required]],
      activityType: [this.product?.activityType || '', [Validators.required]],
      activitySubType: [this.product?.activitySubType || []],
      adminNotes: [this.product?.adminNotes || ''],
      collectionId: [this.product?.collectionId || 'bcparks_', {
        nonNullable: true,
        validators: [Validators.required],
        updateOn: 'blur'
      }],
      displayName: [this.product?.displayName || 'New Product', {
        nonNullable: true,
        validators: [Validators.required]
      }],
      isVisible: [this.product?.isVisible || false],
      passesRequired: [this.product?.passesRequired || false],
      policies: [null],
      qrCodeEnabled: [this.product?.qrCodeEnabled || false],
      reservationPolicy: [this.product?.reservationPolicy || null, [Validators.required]],
      searchTerms: [this.product?.searchTerms || []],
      timezone: [this.product?.timezone, {
        nonNullable: true,
        validators: [Validators.required]
      }],

      // Policies (because alphabetizing them is confusing?)
      changePolicy: [this.product?.changePolicy || null, [Validators.required]],
      description: [this.product?.description || ''],
      feePolicy: [this.product?.feePolicy || null, [Validators.required]],
      partyPolicy: [this.product?.partyPolicy || null, [Validators.required]],

      // New required fields
      numberOfPasses: [this.product?.assetList?.[0]?.quantity || 1, [Validators.required, Validators.min(1)]],
      rangeStart: [this.product?.rangeStart || '', [Validators.required]],
      rangeEnd: [this.product?.rangeEnd || '', [Validators.required]],
      estimationMode: [this.product?.availabilityEstimationPattern?.estimationMode || 'exact', [Validators.required]],
    }, {
      validators: [this.displayNameValidator]
    });

    this.form.updateValueAndValidity();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
    });
    
    // Creating a product: check when collectionId changes and update activites accordingly
    let lastCollectionId = this.form.get('collectionId')?.value;
    this.form.get('collectionId').valueChanges.subscribe((newValue) => {
      if (newValue === lastCollectionId) return;
      lastCollectionId = newValue;
      this.loadAvailableActivities();
    });

    // Creating a product: when an activity is selected, update the related fields
    // (activityType, activityId, activitySubType) so they can be saved with the product
    this.form.get('activity')?.valueChanges.subscribe((selectedActivity) => {
      const activity = selectedActivity?.value || selectedActivity;
      for (const controlName of ['activityType', 'activityId', 'activitySubType']) {
        if (!activity) {
          const emptyValue = controlName === 'activitySubType' ? [] : '';
          this.form.get(controlName)?.setValue(emptyValue, { emitEvent: false });
          this.form.get(controlName)?.markAsDirty();
        } else {
          const value = controlName === 'activitySubType' ? activity[controlName] || [] : activity[controlName] || '';
          this.form.get(controlName)?.setValue(value, { emitEvent: false });
          this.form.get(controlName)?.markAsDirty();
        }
      }
    });
  }

  // Creating product: the activities that are available based on the collectionId
  async loadAvailableActivities() {
    const collectionId = this.form.get('collectionId')?.value;
    if (!collectionId) {
      this.availableActivities = [];
      return;
    }

    this.loadal.show();
    try {
      const activities = await this.activityService.getActivitiesByCollectionId(collectionId);
      const activityItems = Array.isArray(activities?.items)
        ? activities.items
        : Array.isArray(activities)
          ? activities
          : [];

      const uniqueActivities = this.getUniqueActivities(activityItems);
      
      // Map activities to the format needed for the selector input
      this.availableActivities = uniqueActivities.map((a: any) => ({
        display: a.displayName || `${a.activityType} - ${a.activityId}`,
        value: a
      }));

      // Reset activity selection when collectionId changes
      for (const controlName of ['activity', 'activityType', 'activityId', 'activitySubType']) {
        const value = controlName === 'activitySubType' ? [] : controlName === 'activity' ? null : '';
        this.form.get(controlName)?.setValue(value, { emitEvent: false });
        this.form.get(controlName)?.markAsDirty();
      }
      
      console.log(`Loaded ${this.availableActivities.length} available activities for collection ${collectionId}`);
    } catch (error) {
      console.error('Error loading available activities:', error);
    } finally {
      this.loadal.hide();
    }
  }

  removeActivity() {
    this.form.get('activity')?.setValue(null);
  }

  // Product already exists: load and fetch activity entities that are related to this product
  async loadActivityRelationships() {
    this.loadal.show();
    try {
      const activity = await this.activityService.getActivity(this.product.collectionId, this.product.activityType, this.product.activityId);

      if (activity) {
        console.log(`Found ${activity.length} activity`);
        this.relatedActivity = activity;
      } else {
        console.log('No activity found');
        this.relatedActivity = [];
      }

    } catch (error) {
      console.error('Error loading activity relationships:', error);
      this.relatedActivity = [];
    } finally {
      this.loadal.hide();
    }
  }

  // Creating product: load all policies that are available (for now, these are all of our policies anyway)
  async loadAvailablePolicies() {
    this.loadal.show();
    try {
      const policies = await this.policyService.getAllPolicies();

      if (policies?.length > 0) {
        console.log(`Found ${policies.length} policies`);
        this.allAvailablePolicies = policies;
        this.refreshPolicyOptions();
      } else {
        console.log('No policies found');
        this.allAvailablePolicies = [];
        this.policies = [];
      }
    } catch (error) {
      console.error('Error loading policies:', error);
      this.allAvailablePolicies = [];
      this.policies = [];
    } finally {
      this.loadal.hide();
    }
  }

  // Product already exists: load and fetch policies that are tied to this product using product pk/sk on policy GET
  async loadExistingPolicies() {
    this.loadal.show();
    try {
      const productPolicies = await this.policyService.getPoliciesByProduct(this.product.pk, this.product.sk)

      if (productPolicies?.length > 0) {
        console.log(`Found ${productPolicies.length} policies`);
        this.selectedPolicies = productPolicies;
        this.initialPolicies = [...productPolicies];

        // Populate the individual typed policy form controls
        for (const policy of productPolicies) {
          const controlName = `${policy.policyType}Policy`;
          this.form.get(controlName)?.setValue(policy, { emitEvent: false });
        }

        this.refreshPolicyOptions();
      } else {
        console.log('No policies relationships found');
        this.selectedPolicies = [];
        this.refreshPolicyOptions();
      }
    } catch (error) {
      console.error('Error loading policies relationships:', error);
      this.selectedPolicies = [];
      this.refreshPolicyOptions();
    } finally {
      this.loadal.hide();
    }
  }

  // Add selected policy to the linked list and sync typed policy controls.
  addPolicy(policy: any) {
    const selectedPolicy = policy?.value || policy;
    if (!selectedPolicy?.policyType) {
      return;
    }

    // Replace any existing policy of the same type (one per type)
    this.selectedPolicies = this.selectedPolicies.filter(p => p.policyType !== selectedPolicy.policyType);
    this.selectedPolicies.push(selectedPolicy);
    this.refreshPolicyOptions();

    // Sync the typed policy form control (e.g. reservationPolicy, partyPolicy)
    const controlName = `${selectedPolicy.policyType}Policy`;
    const control = this.form.get(controlName);
    if (control) {
      // markAsDirty before setValue so the form is already dirty when valueChanges fires
      control.markAsDirty();
      control.setValue(selectedPolicy);
    }

    this.resetPolicySelector();

  }

  private resetPolicySelector() {
    const policiesControl = this.form.get('policies');

    // Clear the selector control so the next policy can be chosen immediately.
    policiesControl?.setValue(null, { emitEvent: true });
    policiesControl?.markAsPristine();
    policiesControl?.markAsUntouched();
  }

  private refreshPolicyOptions() {
    const selectedKeys = new Set(
      this.selectedPolicies.map((p) => `${p?.policyType || ''}::${p?.policyId || p?.pk || ''}`)
    );

    this.policies = this.allAvailablePolicies.filter((p) => {
      const key = `${p?.policyType || ''}::${p?.policyId || p?.pk || ''}`;
      return !selectedKeys.has(key);
    }).map((policy) => ({
      display: (policy?.displayName || policy?.display || policy?.policyId || 'Policy').trim(),
      value: policy
    }));
  }

  private getUniqueActivities(activities: any[]) {
    const byKey = new Map<string, any>();
    for (const activity of activities) {
      const key = `${activity.collectionId || ''}::${activity.activityType || ''}::${activity.activityId || ''}`;
      const current = byKey.get(key);
      if (!current) {
        byKey.set(key, activity);
        continue;
      }

      const currentVersion = Number(current.version || 0);
      const nextVersion = Number(activity.version || 0);
      if (nextVersion >= currentVersion) {
        byKey.set(key, activity);
      }
    }

    return Array.from(byKey.values());
  }

  // Remove a linked policy and clear its typed policy control.
  removePolicy(policy: any) {
    this.selectedPolicies = this.selectedPolicies.filter(p => p.pk !== policy.pk);

    // Clear the typed policy form control
    const controlName = `${policy.policyType}Policy`;
    const control = this.form.get(controlName);
    if (control) {
      // markAsDirty before setValue so the form is already dirty when valueChanges fires
      control.markAsDirty();
      control.setValue(null);
    }

    this.refreshPolicyOptions();
  }

  // Handle search terms updates from the component
  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.form.get('searchTerms')?.markAsDirty();
    this.cdr.detectChanges();
  }

  // Custom validator to ensure displayName is not the default placeholder
  private displayNameValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const displayName = group.get('displayName')?.value;

    // Check that the value is a string, not empty, and not the default placeholder
    if (typeof displayName === 'string' && displayName.trim().length > 0 && displayName !== 'New Product') {
      return null;
    }
    return { invalidDisplayName: true };
  }

  // Reset the form to the original product values, including restoring policies and related activity
  resetToProduct(product: any) {
    this.form.reset({ ...product });

    // Restore policy display list and typed form controls from the initial snapshot
    this.selectedPolicies = [...this.initialPolicies];
    for (const policy of this.initialPolicies) {
      const controlName = `${policy.policyType}Policy`;
      this.form.get(controlName)?.setValue(policy, { emitEvent: false });
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}
