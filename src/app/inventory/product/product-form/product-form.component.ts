import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, effect, EventEmitter, OnInit, Output, signal, ViewChild, WritableSignal, TemplateRef, Input } from '@angular/core';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { Constants } from '../../../app.constants';
import { LoadingService } from '../../../services/loading.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormControl, UntypedFormGroup, Validators, AbstractControl } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { EntityRelationshipSelectorComponent, EntityRelationshipConfig } from '../../../shared/components/entity-relationship-selector/entity-relationship-selector.component';
import { EntitySelectionDropdownItemComponent } from '../../../shared/components/entity-selection-dropdown-item/entity-selection-dropdown-item.component';
import { RelationshipService } from '../../../services/relationship.service';
import { PolicyService } from '../../../services/policy.service';
import { PolicySelectorComponent } from '../../../shared/components/policy-selector/policy-selector.component';
import { ActivityListItemComponent } from '../../activity/activity-list-item/activity-list-item.component';
import { PolicyListItemComponent } from '../../policy/policy-list-item/policy-list-item.component';
import { ActivityRelationshipService } from '../../../services/activityRelationip.service';

@Component({
  selector: 'app-product-form',
  imports: [
    CommonModule,
    LoadalComponent,
    ActivityListItemComponent,
    EntityRelationshipSelectorComponent,
    EntitySelectionDropdownItemComponent,
    NgdsFormsModule,
    PolicyListItemComponent,
    PolicySelectorComponent,
    SearchTermsComponent
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;
  @ViewChild('activityItemTemplate') activityItemTemplate: TemplateRef<any>;
  @ViewChild('activitySelectionTemplate') activitySelectionTemplate: TemplateRef<any>;
  @ViewChild('activityRelationshipSelector') activityRelationshipSelector: EntityRelationshipSelectorComponent;

  @Input() isEditing: boolean = false;

  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();
  @Output() relationshipsLoaded: EventEmitter<{ type: string, relationships: any[] }> = new EventEmitter();
  @Output() relationshipsChanged: EventEmitter<{ type: string, relationships: any[] }> = new EventEmitter();

  public form;
  public product;
  public _locationMarker: WritableSignal<any[]> = signal([]);
  public _minMapZoom: WritableSignal<any> = signal(6);
  public _maxMapZoom: WritableSignal<any> = signal(15);
  public defaultCoordinates = [-125.58725792949612, 49.52175870730247];
  public defaultProductName = 'New Product';
  public markerOptions = {
    displayName: this.defaultProductName,
    color: '#003366',
    draggable: true,
    minZoom: this._minMapZoom(),
    maxZoom: this._maxMapZoom(),
  };

  public timezones = Constants.timezones;
  public activityTypes = Object.entries(Constants.activityTypes).map(([key, value]) => value);

  // Activity selection
  public activitiesLoading: boolean = false;
  public _activities: WritableSignal<any[]> = signal([]);
  public selectedActivity: any = null;
  public activityRelationshipConfig: EntityRelationshipConfig | null = null;

  // Reservation policy selection
  public selectedPolicies: Record<string, any> = { reservation: null, party: null, fee: null, change: null };
  public resolvedPolicies: Record<string, any> = { reservation: null, party: null, fee: null, change: null };
  public policyTypes: ('reservation' | 'party' | 'fee' | 'change')[] = ['reservation', 'party', 'fee', 'change'];

  constructor(
    protected cdr: ChangeDetectorRef,
    protected policyService: PolicyService,
    protected relationshipService: RelationshipService,
    protected loadingService: LoadingService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected activityRelationshipService: ActivityRelationshipService

  ) {
    if (this.route?.parent?.snapshot?.data?.['product']) {
      this.product = this.route.parent.snapshot.data['product'];
    }
  };

  ngOnInit(): void {
    this.activityTypes = this.activityTypes.filter(type => type.value !== 'noType');
    this.initializeForm();
  }

  ngAfterViewInit(): void {
    // We build the activity relationship config outside of the product component
    this.activityRelationshipConfig = this.activityRelationshipService.buildConfig(
      this.form,
      this.activityItemTemplate,
      this.activitySelectionTemplate,
      () => this.activityRelationshipSelector
    );

    // We load the activity and policies differently if it's an edit
    // Because you don't actually edit either (just show them to the user)
    if (this.isEditing) {
      this.loadActivityForEdit();
      this.loadPoliciesForEdit();
    }
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
  }

  private initializeForm() {
    this.form = new UntypedFormGroup({
      collectionId: new UntypedFormControl(
        this.product?.collectionId || '',
        {
          nonNullable: true,
          validators: [Validators.required],
          updateOn: 'blur'
        }
      ),
      activityType: new UntypedFormControl(
        this.product?.activityType || '',
        {
          validators: [Validators.required]
        }
      ),
      activitySubType: new UntypedFormControl(
        this.product?.activitySubType || ''
      ),
      activityId: new UntypedFormControl(
        this.product?.activityId || '',
        {
          validators: [Validators.required]
        }
      ),
      activities: new UntypedFormControl(
        this.product?.activities || []
      ),
      displayName: new UntypedFormControl(
        this.product?.displayName || this.defaultProductName,
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      timezone: new UntypedFormControl(
        this.product?.timezone || 'America/Vancouver',
        {
          nonNullable: true,
          validators: [Validators.required]
        }
      ),
      rangeStart: new UntypedFormControl(
        this.product?.rangeStart || '',
        {
          validators: [Validators.required]
        }
      ),
      rangeEnd: new UntypedFormControl(
        this.product?.rangeEnd || '',
        {
          validators: [Validators.required]
        }
      ),
      minStay: new UntypedFormGroup({
        days: new UntypedFormControl(Number(this.product?.minStay?.days) || 0),
        hours: new UntypedFormControl(Number(this.product?.minStay?.hours) || 0),
        minutes: new UntypedFormControl(Number(this.product?.minStay?.minutes) || 0),
      }),
      maxStay: new UntypedFormGroup({
        days: new UntypedFormControl(Number(this.product?.maxStay?.days) || 0),
        hours: new UntypedFormControl(Number(this.product?.maxStay?.hours) || 0),
        minutes: new UntypedFormControl(Number(this.product?.maxStay?.minutes) || 0)
      }),
      reservationPolicy: new UntypedFormControl(
        this.product?.reservationPolicy || [],
        {
          validators: [Validators.required]
        }
      ),
      partyPolicy: new UntypedFormControl(
        this.product?.partyPolicy || [],
        {
          validators: [Validators.required]
        }
      ),
      feePolicy: new UntypedFormControl(
        this.product?.feePolicy || [],
        {
          validators: [Validators.required]
        }
      ),
      changePolicy: new UntypedFormControl(
        this.product?.changePolicy || [],
        {
          validators: [Validators.required]
        }
      ),
      description: new UntypedFormControl(
        this.product?.description || '',
      ),
      isVisible: new UntypedFormControl(
        this.product?.isVisible || false
      ),
      searchTerms: new UntypedFormControl(
        this.product?.searchTerms || []
      ),
      adminNotes: new UntypedFormControl(
        this.product?.adminNotes || ''
      )
    }, {
      validators: [
        this.displayNameValidator,
        this.dateRangeValidator,
        this.stayDurationValidator,
        this.policiesRequiredValidator
      ]
    });

    this.form.updateValueAndValidity();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });

    // Ensure duration values are always numbers, not strings
    const durationControls = [
      'minStay.days', 'minStay.hours', 'minStay.minutes',
      'maxStay.days', 'maxStay.hours', 'maxStay.minutes'
    ];
    durationControls.forEach(path => {
      this.form.get(path)?.valueChanges.subscribe(value => {
        const numValue = Number(value);
        if (value !== numValue && !isNaN(numValue)) {
          this.form.get(path)?.setValue(numValue, { emitEvent: false });
        }
      });
    });
  }

  // If we're editing a product, we load the activity but we don't allow it to actually be editable
  async loadActivityForEdit() {
    if (!this.product) return;
    const { collectionId, activityType, activityId } = this.product;
    try {
      this.selectedActivity = await this.activityRelationshipService.loadActivityForProduct(
        collectionId, activityType, activityId
      );
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading activity for product:', error);
    }
  }

  // Same for policies - if we're editing a product, we don't allow the policies to actually be editable
  async loadPoliciesForEdit() {
    if (!this.product?.pk || !this.product?.sk) return;
    try {
      const policies = await this.policyService.getPoliciesByProduct(this.product.pk, this.product.sk);
      if (policies?.length) {
        for (const policy of policies) {
          if (policy?.policyType) {
            this.resolvedPolicies[policy.policyType] = policy;
          }
        }
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading policies for product:', error);
    }
  }

  // When the activity relationship selector loads the available activities, if the product already has an activity we want to show load it in
  async onActivitiesChanged(activities: any[]) {
    const activity = activities[0] ?? null;

    // Just the one activity per product
    this.selectedActivity = activity;
    const fields = activity
      ? { activityType: activity.activityType, activitySubType: activity.activitySubType, activityId: activity.activityId, activities }
      : { activityType: null, activitySubType: null, activityId: null, activities: [] };

    // Update form values and mark as dirty to ensure they are included in form submission
    Object.entries(fields).forEach(([key, value]) => {
      this.form.get(key)?.setValue(value);
      if (activity) this.form.get(key)?.markAsDirty();
    });

    this.relationshipsChanged.emit({ type: 'activities', relationships: activities });
    this.cdr.detectChanges();
  }

  isActivityEntitySelected = (entity: any): boolean =>
    this.selectedActivity?.pk === entity.pk && this.selectedActivity?.sk === entity.sk;

  selectActivityEntity = (match: any) =>
    this.activityRelationshipSelector?.selectEntity(match);

  onActivityRelationshipsLoaded(activities: any[]) {
    if (activities.length > 0) this.selectedActivity = activities[0];
    this.relationshipsLoaded.emit({ type: 'activity', relationships: activities });
  }

  // Handle policy selection changes
  onPolicyChanged(policyType, policies) {
    const policy = policies[0] ?? null;
    this.selectedPolicies[policyType] = policy;
    this.form.get(`${policyType}Policy`)?.setValue(policies);
    this.form.get(`${policyType}Policy`)?.markAsDirty();
    this.relationshipsChanged.emit({ type: `${policyType}Policy`, relationships: policies });
    this.cdr.detectChanges();
  }

  // Handle policy relationships loaded
  onPolicyLoaded(policyType, policies) {
    if (policies.length > 0) {
      this.selectedPolicies[policyType] = policies[0];
    }
    this.relationshipsLoaded.emit({ type: `${policyType}Policy`, relationships: policies });
  }

  // Handle search terms updates from the component
  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.form.get('searchTerms')?.markAsDirty();
    this.cdr.detectChanges();
  }

  private displayNameValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const displayName = group.get('displayName')?.value;

    // Check that the value is a string, not empty, and not the default placeholder
    if (typeof displayName === 'string' && displayName.trim().length > 0 && displayName !== 'New Product') {
      return null;
    }
    return { invalidDisplayName: true };
  }

  // Custom validator: rangeStart must be less than rangeEnd
  private dateRangeValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const rangeStart = group.get('rangeStart')?.value;
    const rangeEnd = group.get('rangeEnd')?.value;

    // Only validate if both dates are present
    if (!rangeStart || !rangeEnd) {
      return null;
    }

    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null; // Let required validator handle invalid dates
    }

    // Check if start date is less than end date
    if (startDate >= endDate) {
      return { dateRangeInvalid: true };
    }

    return null;
  }

  // Custom validator: minStay must be less than maxStay
  private stayDurationValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const minStay = group.get('minStay')?.value;
    const maxStay = group.get('maxStay')?.value;

    // Only validate if both have values
    if (!minStay || !maxStay) {
      return null;
    }

    // Convert to total minutes for comparison
    const minMinutes = (minStay.days || 0) * 24 * 60 + (minStay.hours || 0) * 60 + (minStay.minutes || 0);
    const maxMinutes = (maxStay.days || 0) * 24 * 60 + (maxStay.hours || 0) * 60 + (maxStay.minutes || 0);

    // Skip validation if both are 0 (not set)
    if (minMinutes === 0 && maxMinutes === 0) {
      return null;
    }

    // Check if min is less than max
    if (minMinutes >= maxMinutes) {
      return { stayDurationInvalid: true };
    }

    return null;
  }

  private policiesRequiredValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const reservationPolicy = group.get('reservationPolicy')?.value;
    const partyPolicy = group.get('partyPolicy')?.value;
    const feePolicy = group.get('feePolicy')?.value;
    const changePolicy = group.get('changePolicy')?.value;

    // Error if even one policy is missing
    if (reservationPolicy.length === 0 || partyPolicy.length === 0 || feePolicy.length === 0 || changePolicy.length === 0) {
      return { policiesRequired: true };
    }

    return null;
  }
}
