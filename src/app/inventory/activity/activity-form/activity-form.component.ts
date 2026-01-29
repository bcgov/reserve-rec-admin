import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  WritableSignal,
  signal,
  AfterViewChecked,
  Output,
  EventEmitter,
  TemplateRef
} from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilityService } from '../../../services/facility.service';
import { GeozoneService } from '../../../services/geozone.service';
import { Constants } from '../../../app.constants';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { ProtectedAreaService } from '../../../services/protected-area.service';
import { FacilityListItemComponent } from '../../facility/facility-list-item/facility-list-item.component';

@Component({
  selector: 'app-activity-form',
  imports: [NgdsFormsModule, CommonModule, LoadalComponent, SearchTermsComponent, FacilityListItemComponent],
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.scss']
})
export class ActivityFormComponent implements OnInit, AfterViewChecked {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent;
  @ViewChild('searchTerms', { static: false }) searchTermsComponent!: SearchTermsComponent;
  @ViewChild('facilitySelectTemplate') facilitySelectTemplate: TemplateRef<any>;
  @ViewChild('geozoneSelectTemplate') geozoneSelectTemplate: TemplateRef<any>;

  @Output() formValue: EventEmitter<any> = new EventEmitter<any>();

  public form: UntypedFormGroup;
  public activity: any;
  public defaultActivityName = 'New Activity';
  public activityTypes = Object.values(Constants.activityTypes);
  public activitySubTypes: any[] = [];

  public protectedAreas: any[] = [];
  public _facilities: WritableSignal<any[]> = signal([]);
  public linkedFacilities: any[] = [];
  public unlinkedFacilities: any[] = [];
  public _geozones: WritableSignal<any[]> = signal([]);
  public linkedGeozones: any[] = [];
  public unlinkedGeozones: any[] = [];
  public facilitiesLoading: boolean = false;
  public geozonesLoading: boolean = false;
  public currentMapMarker: any[] = [];
  private protectedAreasData: any[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private protectedAreaService: ProtectedAreaService,
    public loadingService: LoadingService,
    private facilityService: FacilityService,
    private geozoneService: GeozoneService,
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

    // Initialize form first to prevent template errors
    this.initializeForm();

    if (this.activity) {
      this.getFacilitiesByCollectionId();
    }

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
      orcs: new UntypedFormControl(this.activity?.orcs || '', {
        nonNullable: true,
      }),
      facilities: new UntypedFormControl(this.mapFacilityPkSk(this.activity?.facilities) || '', {
      }),
      allFacilities: new UntypedFormControl([], {
      }),
      allGeozones: new UntypedFormControl([], {
      }),
      displayName: new UntypedFormControl(this.activity?.displayName || this.defaultActivityName, {
        nonNullable: true,
        validators: [Validators.required]
      }),
      isVisible: new UntypedFormControl(this.activity?.isVisible || false),
      description: new UntypedFormControl(this.activity?.description || ''),
      geozones: new UntypedFormControl(this.activity?.geozones || ''),
      activitySubType: new UntypedFormControl(this.activity?.activitySubType || ''),
      imageUrl: new UntypedFormControl(this.activity?.imageUrl || ''),
      searchTerms: new UntypedFormControl(
        this.activity?.searchTerms?.join(', ') || ''
      ),
      adminNotes: new UntypedFormControl(this.activity?.adminNotes || '')
    });

    this.form.get('displayName').markAsDirty();
    this.form.updateValueAndValidity();

    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
      this.cdr.detectChanges();
    });

    this.form.get('collectionId').valueChanges.subscribe(() => {
      this._facilities.set([]);
      this.form.get('allFacilities')?.setValue([]);
      this.getFacilitiesByCollectionId();
    });

    this.form.get('activityType').valueChanges.subscribe(() => {
      this.updateFilteredActivitySubTypes();
    });

    this.form.get('allFacilities').valueChanges.subscribe((facilities) => {
      // convert existing linkedFacilities to a Set for easier management
      if (!facilities) {
        facilities = [];
      }
      const formValue = facilities.map(f => {
        return {
          pk: f.pk,
          sk: f.sk
        };
      });
      this.form.get('facilities')?.setValue(formValue);
      this.form.get('facilities')?.markAsDirty();
    });
  }

  mapFacilityPkSk(facilities) {
    if (!facilities?.length) {
      return [];
    }
    return facilities.map(f => {
      return {
        pk: f.pk,
        sk: f.sk
      };
    });
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  // Update ORCS based on selected protected area
  async updateOrcs() {
    const selectedAreaName = this.form.get('protectedArea')?.value;

    // Only continue if value matches one of the known protected areas
    const matchedPA = this.protectedAreasData.find(pa => pa.displayName === selectedAreaName);
    if (!matchedPA) {
      return;
    }
    // Find the selected protected area and set ORCS
    const orcs = matchedPA.orcs;
    const orcsControl = this.form.get('orcs');
    orcsControl?.setValue(`${orcs}`);
    orcsControl?.markAsDirty();

    this.cdr.detectChanges();
  }

  selectFacility(match, control) {
    let value = [];
    value = value.concat(match.value);
    if (control?.value) {
      value = value.concat(control.value);
    }
    control.setValue(value);
  }

  selectGeozone(match, control) {
    control.setValue(match.value);
  }

  removeLinkedFacility(facility) {
    this.linkedFacilities = this.linkedFacilities.filter(f => f !== facility);
    const formValue = this.form.get('allFacilities')?.value;
    const newValue = formValue.filter(f => f !== facility);
    this.form.get('allFacilities')?.setValue(newValue);
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

  async getGeozonesByCollectionId() {
    this.geozonesLoading = true;
    const collectionId = this.form.get('collectionId')?.value;
    const geozoneRes = await this.geozoneService.getGeozoneByCollectionId(collectionId);
    if (!geozoneRes) {
      this._geozones.set([]);
      this.geozonesLoading = false;
      return;
    } else {
      this._geozones.set(geozoneRes.items.map(g => {
        return {
          value: g,
          display: g.displayName,
        };
      }));
      this.geozonesLoading = false;
      return;
    }
  }

  async getFacilitiesByCollectionId() {
    this.facilitiesLoading = true;
    this._facilities.set([]);
    const collectionId = this.form.get('collectionId')?.value;
    const facilityRes = await this.facilityService.getFacilitiesByCollectionId(collectionId);
    if (facilityRes?.items?.length) {
      this._facilities.set(facilityRes.items.map(f => {
        return {
          value: f,
          display: f.displayName,
        };
      }));
      setTimeout(() => {
        this.updateFacilitiesList();
      }, 0);
      this.facilitiesLoading = false;
      return;
    }
    this.facilitiesLoading = false;
  }

  updateFacilitiesList() {
    if (this.activity?.facilities?.length > 0) {
      const linkedFacilitiesSet = new Set();
      for (const facility of this.activity.facilities) {
        const fullFacility = this._facilities().find(f => f.value.pk === facility.pk && f.value.sk === facility.sk);
        if (fullFacility) {
          linkedFacilitiesSet.add(fullFacility.value);
        }
      }
      this.form.get('allFacilities')?.setValue(Array.from(linkedFacilitiesSet));
    }
  }


}
