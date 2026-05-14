import { AfterViewChecked, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CollectionService } from '../../../services/collection.service';
import { Constants } from '../../../app.constants';
import { SearchTermsComponent } from '../../../shared/components/search-terms/search-terms.component';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { LoadingService } from '../../../services/loading.service';
import { PermissionDirective } from '../../../shared/directives/permission.directive';

@Component({
  selector: 'app-collection-form',
  imports: [CommonModule, ReactiveFormsModule, NgdsFormsModule, SearchTermsComponent, LoadalComponent, PermissionDirective],
  templateUrl: './collection-form.component.html',
  styleUrl: './collection-form.component.scss'
})
export class CollectionFormComponent implements OnInit, AfterViewChecked {
  @Input() collection: any = null;
  @Input() isCreating: boolean = false;
  @Output() formValue = new EventEmitter<UntypedFormGroup>();

  public form: UntypedFormGroup;
  public timezones = Constants.timezones;

  constructor(
    protected fb: UntypedFormBuilder,
    protected collectionService: CollectionService,
    protected loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.buildForm();
    if (this.collection) {
      this.populateForm(this.collection);
    }
    this.form.valueChanges.subscribe(() => {
      this.formValue.emit(this.form);
    });
    this.formValue.emit(this.form);
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  buildForm() {
    this.form = this.fb.group({
      collectionId: [{ value: '', disabled: !!this.collection }, Validators.required],
      displayName: ['', Validators.required],
      description: [''],
      orcs: [null],
      // memberCollectionIds: [[]],
      isVisible: [false],
      searchTerms: [[]],
      adminNotes: [''],
    }, {
      validators: this.isCreating ? [this.collectionIdValidator] : []
    });
  }

  populateForm(collection: any) {
    this.form.patchValue({
      collectionId: collection.collectionId,
      displayName: collection.displayName,
      description: collection.description || '',
      // memberCollectionIds: collection.memberCollectionIds || [],
      isVisible: collection.isVisible ?? false,
      searchTerms: collection.searchTerms || [],
      adminNotes: collection.adminNotes || '',
    });
  }

  getFormValue(): any {
    const value = { ...this.form.getRawValue() };
    // Coerce orcs to number if provided
    if (value.orcs !== null && value.orcs !== '') {
      const parsed = Number(value.orcs);
      value.orcs = isNaN(parsed) ? value.orcs : parsed;
    } else {
      delete value.orcs;
    }
    // Clean memberCollectionIds: filter blanks
    if (Array.isArray(value.memberCollectionIds)) {
      value.memberCollectionIds = value.memberCollectionIds.filter((id: string) => !!id);
    }
    return value;
  }

  onSearchTermsChange(searchTerms: string[]) {
    this.form.get('searchTerms')?.setValue(searchTerms);
    this.form.get('searchTerms')?.markAsDirty();
  }

  resetToCollection(collection: any) {
    this.form.reset();
    this.populateForm(collection);
  }

  private collectionIdValidator(control: AbstractControl) {
    const group = control as UntypedFormGroup;
    const collectionId = group.value['collectionId'];

    // Check that the collectionId is a string, fewer than 40 characters, and only contains
    // alpha numeric characters and underscores (for now)
    if (
      typeof collectionId === 'string' &&
      collectionId.length <= 40 &&
      /^[a-zA-Z0-9_]+$/.test(collectionId)
    ) {
      return null;
    }

    return { invalidCollectionId: true };
  }
}
