import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, effect, EventEmitter, OnInit, Output, signal, ViewChild, WritableSignal, TemplateRef } from '@angular/core';
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
import { ActivityService } from '../../../services/activity.service';

@Component({
  selector: 'app-product-form',
  imports: [NgdsFormsModule, LoadalComponent, CommonModule, SearchTermsComponent, EntityRelationshipSelectorComponent, EntitySelectionDropdownItemComponent],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit, AfterViewChecked {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;
  @ViewChild('activityItemTemplate') activityItemTemplate: TemplateRef<any>;
  @ViewChild('activitySelectionTemplate') activitySelectionTemplate: TemplateRef<any>;
  @ViewChild('activityRelationshipSelector') activityRelationshipSelector: EntityRelationshipSelectorComponent;

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

  // Activity selection (single activity only)
  public activitiesLoading: boolean = false;
  public _activities: WritableSignal<any[]> = signal([]);
  public selectedActivity: any = null;
  public activityRelationshipConfig: EntityRelationshipConfig | null = null;

  // Policies (coming soon)
  public policies = ["policy1", "policy2", "policy3"];

  constructor(
    protected cdr: ChangeDetectorRef,
    protected activityService: ActivityService,
    protected relationshipService: RelationshipService,
    protected loadingService: LoadingService,
    protected router: Router,
    protected route: ActivatedRoute
  ) {
    if (this.route?.parent?.snapshot?.data?.['product']) {
      this.product = this.route.parent.snapshot.data['product'];
    }
    // Initialize the location marker with an empty array
    effect(() => {});
  };

  ngOnInit(): void {
    this.activityTypes = this.activityTypes.filter(type => type.value !== 'noType');
    
    this.initializeForm();
    
    this.initializeRelationshipConfigs();
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
      policies: new UntypedFormControl(
        this.product?.policies || []
      ),
      description: new UntypedFormControl(
        this.product?.description || '',
      ),
      isVisible: new UntypedFormControl(
        this.product?.isVisible || true
      ),
      searchTerms: new UntypedFormControl(
        this.product?.searchTerms || []
      ),
      adminNotes: new UntypedFormControl(
        this.product?.adminNotes || ''
      )
    }, {
      validators: [this.dateRangeValidator, this.stayDurationValidator]
    });

    this.form.get('displayName').markAsDirty();
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

  // Handle search terms updates from the component
  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.cdr.detectChanges();
  }

  // Mark the search terms form control as dirty when a term is added
  onSearchTermDirty() {
    this.form.get('searchTerms')?.markAsDirty();
  }

  initializeRelationshipConfigs() {
    // Activity selection configuration (single select only)
    this.activityRelationshipConfig = {
      sourceSchema: 'product',
      targetSchema: 'activity',
      label: 'Select the activity for this product',
      placeholder: 'Start typing to search activities...',
      multiselect: false,
      immutableSelection: true,
      selectedItemTemplate: this.activityItemTemplate,
      selectionListTemplate: this.activitySelectionTemplate,
      searchFields: {
        collectionId: this.form.get('collectionId')?.value
      },
      fetchFn: async (searchFields) => {
        // Only fetch activities if collectionId is set
        if (this.form.get('collectionId')?.value) {
          const result = await this.activityService.getActivitiesByCollectionId(
            searchFields.collectionId
          );
          return result;
        }
      },
      filterFn: (activity, searchFields) => {
        // Only show activities matching the product's collectionId
        return activity.collectionId === searchFields.collectionId;
      }
    };

    // Watch for collectionId changes to update search fields
    this.form.get('collectionId')?.valueChanges.subscribe(collectionId => {
      if (this.activityRelationshipConfig) {
        this.activityRelationshipConfig.searchFields = { collectionId };
        // Trigger reload of entities in the selector component
        if (this.activityRelationshipSelector) {
          this.activityRelationshipSelector.loadAvailableEntities();
        }
      }
    });
  }

  // Handle activity selection (just a single activity only)
  async onActivitiesChanged(activities: any[]) {
    console.log('Activity changed:', activities);
    
    // Since it's single select, take the first (and only) activity
    const activity = activities.length > 0 ? activities[0] : null;
    this.selectedActivity = activity;
    
    if (activity) {
      // Auto-populate activityType, activitySubType, and activityId from selected activity
      this.form.get('activityType')?.setValue(activity.activityType);
      this.form.get('activityType')?.markAsDirty();
      
      this.form.get('activitySubType')?.setValue(activity.activitySubType || null);
      this.form.get('activitySubType')?.markAsDirty();
      
      this.form.get('activityId')?.setValue(activity.activityId);
      this.form.get('activityId')?.markAsDirty();

      // Also set the activities array, used for creating relationship
      this.form.get('activities')?.setValue(activities);
      this.form.get('activities')?.markAsDirty();
      
      console.log('Auto-populated from activity:', {
        activityType: activity.activityType,
        activitySubType: activity.activitySubType,
        activityId: activity.activityId
      });
    } else {
      // Clear fields if no activity selected
      this.form.get('activityType')?.setValue(null);
      this.form.get('activitySubType')?.setValue(null);
      this.form.get('activityId')?.setValue(null);
      this.form.get('activities')?.setValue([]);
    }
    
    // Emit event to parent
    this.relationshipsChanged.emit({ type: 'activities', relationships: activities });
    this.cdr.detectChanges();
  }

  // Handle activity relationships loaded (for edit mode)
  onActivityRelationshipsLoaded(activities: any[]) {
    console.log('Activity relationships loaded:', activities);
    if (activities.length > 0) {
      this.selectedActivity = activities[0];
    }
    this.relationshipsLoaded.emit({ type: 'activity', relationships: activities });
  }

  // Check if an entity is currently selected
  isEntitySelected(entity: any): boolean {
    return this.selectedActivity?.pk === entity.pk && this.selectedActivity?.sk === entity.sk;
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

}
