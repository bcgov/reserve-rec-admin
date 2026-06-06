import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  Output,
  EventEmitter
} from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Constants } from '../../../app.constants';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { CollectionSelectorComponent } from '../../../shared/components/collection-selector/collection-selector.component';

@Component({
  selector: 'app-activity-form',
  imports: [NgdsFormsModule, CommonModule, SearchTermsComponent, CollectionSelectorComponent],
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss']
})
export class ActivityFormComponent implements OnInit, AfterViewInit {
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;

  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();

  public form: UntypedFormGroup;
  public activity: any;
  public defaultActivityName = 'New Activity';
  public activityTypes = Object.values(Constants.activityTypes);
  public activitySubTypes: any[] = [];


  constructor(
    private cdr: ChangeDetectorRef,
    public loadingService: LoadingService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (this.route?.parent?.snapshot?.data?.['activity']) {
      this.activity = this.route.parent.snapshot.data['activity'];
    }
  }

  ngOnInit() {
    this.activityTypes = this.activityTypes.filter(type => type.value !== 'noType');

    // Populate sub-type options BEFORE creating the form. The ngds picklist
    // resets its bound control if the control's value isn't in the options
    // when its @Input first binds — which wipes activitySubType on edit if
    // we populate options after form init. See #221.
    this.activitySubTypes = this.subTypeOptionsFor(this.activity?.activityType);

    this.initializeForm();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });

  }

  ngAfterViewInit() {
    // The ngds picklist resets its bound control during its own
    // ngAfterViewInit if the saved value isn't in its options at that exact
    // moment (it defers the options→value reconciliation to after view init,
    // and an empty options array in that window wipes the value). The parent's
    // ngAfterViewInit runs after the child's, so re-apply the saved sub-type
    // here to restore it. See #221.
    const savedSubType = this.activity?.activitySubType;
    if (savedSubType && this.form.get('activitySubType')?.value !== savedSubType) {
      this.form.get('activitySubType')?.setValue(savedSubType);
      this.cdr.detectChanges();
    }
  }

  private initializeForm() {
    this.form = new UntypedFormGroup({
      collectionId: new UntypedFormControl(this.activity?.collectionId || '', {
        nonNullable: true,
        validators: [Validators.required],
        updateOn: 'blur'
      }),
      activityType: new UntypedFormControl(this.activity?.activityType || '', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      facilities: new UntypedFormControl(this.mapEntityPkSk(this.activity?.facilities) || '', {
      }),
      geozones: new UntypedFormControl(this.mapEntityPkSk(this.activity?.geozones) || '', {
      }),
      displayName: new UntypedFormControl(this.activity?.displayName || this.defaultActivityName, {
        nonNullable: true,
        validators: [Validators.required]
      }),
      isVisible: new UntypedFormControl(this.activity?.isVisible || false),
      description: new UntypedFormControl(this.activity?.description || ''),
      activitySubType: new UntypedFormControl(this.activity?.activitySubType || ''),
      imageUrl: new UntypedFormControl(this.activity?.imageUrl || ''),
      searchTerms: new UntypedFormControl(
        this.activity?.searchTerms || []
      ),
      adminNotes: new UntypedFormControl(this.activity?.adminNotes || '')
    });

    this.form.get('displayName').markAsDirty();
    this.form.updateValueAndValidity();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });


    this.form.get('activityType').valueChanges.subscribe((newType) => {
      this.activitySubTypes = this.subTypeOptionsFor(newType);
      this.cdr.detectChanges();
    });
  }


  // Generic utility method to map entities to pk/sk objects
  mapEntityPkSk(entities: any[]): { pk: string; sk: string }[] {
    if (!entities?.length) {
      return [];
    }
    return entities.map(entity => ({
      pk: entity.pk,
      sk: entity.sk
    }));
  }

  // Build the sub-type options for a given activity type (used both during
  // initial form setup and when the user changes activity type).
  private subTypeOptionsFor(activityType: string | undefined): { display: string; value: string }[] {
    if (!activityType) {
      return [];
    }
    const subTypes = Constants.activityTypes[activityType]?.subTypes || {};
    return Object.entries(subTypes).map(([, value]: [any, any]) => ({
      display: value?.display,
      value: value?.value,
    }));
  }

  // Handle search terms updates from the component
  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.form.get('searchTerms')?.markAsDirty();
    this.cdr.detectChanges();
  }

  // Allow user to go an create a new facility
  navigateCreateFacility() {
    const collectionId = this.form.get('collectionId')?.value;
    const orcs = this.form.get('orcs')?.value;
    this.router.navigate([`/inventory/facility/create/${collectionId}/${orcs}`]);
  }

  // Allow user to go an create a new facility
  navigateCreateGeozone() {
    const collectionId = this.form.get('collectionId')?.value;
    const orcs = this.form.get('orcs')?.value;
    this.router.navigate([`/inventory/geozone/create/${collectionId}/${orcs}`]);
  }

  navigateToEntityRelationships() {
    const collectionId = this.form.get('collectionId')?.value;
    const activityType = this.form.get('activityType')?.value;
    const activityId = this.activity?.activityId;
    // Navigate to the entity relationships page for this activity
    // Format: activity::collectionId::activityType::activityId
    this.router.navigate(['/inventory/create/relationships'], {
      queryParams: {
        collectionId: collectionId,
        sourceEntityType: 'activity',
        sourceEntity: `activity::${collectionId}::${activityType}::${activityId}`
      }
    });
  }
}
