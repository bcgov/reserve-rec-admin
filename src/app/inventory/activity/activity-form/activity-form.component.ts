import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  AfterViewChecked,
  Output,
  EventEmitter
} from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Constants } from '../../../app.constants';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';

@Component({
  selector: 'app-activity-form',
  imports: [NgdsFormsModule, CommonModule, LoadalComponent, SearchTermsComponent],
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss']
})
export class ActivityFormComponent implements OnInit, AfterViewChecked {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
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
    this.activitySubTypes = [];

    this.initializeForm();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });

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


    this.form.get('activityType').valueChanges.subscribe(() => {
      this.updateFilteredActivitySubTypes();
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

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  // Update filtered activity sub types when activity type changes
  updateFilteredActivitySubTypes() {
    const selectedType = this.form.get('activityType')?.value;
    if (selectedType) {
      this.activitySubTypes = Object.entries(Constants.activityTypes[selectedType]?.subTypes || {}).map(([key, value]: [any, any]) => {
        return {
          display: value?.display,
          value: value?.value
        };
      });
    } else {
      this.activitySubTypes = [];
    }
    this.cdr.detectChanges();
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
