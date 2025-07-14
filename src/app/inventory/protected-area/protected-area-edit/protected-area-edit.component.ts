import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { LoadingService } from '../../../services/loading.service';
import { ProtectedAreaService } from '../../../services/protected-area.service';
import { ActivatedRoute } from '@angular/router';
import { ModalComponent, modalSchema } from '../../../shared/components/modal/modal.component';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Utils } from '../../../utils/utils';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ModalRowSpec } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
@Component({
  selector: 'app-protected-area-edit-component',
  imports: [CommonModule, NgdsFormsModule, ModalComponent, DatePipe, FormsModule],
  templateUrl: './protected-area-edit.component.html',
  styleUrls: ['./protected-area-edit.component.scss'],
  providers: [BsModalService]

})
export class ProtectedAreaEditComponent implements AfterViewChecked, OnDestroy {
  public form;
  public fields;
  public protectedArea;
  public protectedAreaEditModal: modalSchema;
  public protectedAreaEditModalRef: BsModalRef;
  private utils = new Utils();
  public searchTermSet!: string;
  public searchTerms: string[] = [];
  public searchTermExists = false;

  @ViewChild('protectedAreaEditConfirmationTemplate')
  protectedAreaEditConfirmationTemplate: TemplateRef<any>;

  constructor(
    protected protectedAreaService: ProtectedAreaService,
    protected loadingService: LoadingService,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    private modalService: BsModalService
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['protectedArea']['data']) {
        this.protectedArea = data['protectedArea']['data'];
      }
    });
    this.initForm();
  }

  initForm() {
    // Split the search terms string into an array if it exists.
    if (this.protectedArea?.searchTerms?.length > 0) {
      this.searchTerms = this.protectedArea?.searchTerms.split(',')
    }

    this.form = new UntypedFormGroup({
      protectedAreaName: new UntypedFormControl(this.protectedArea?.displayName),
      protectedAreaOrcs: new UntypedFormControl(this.protectedArea?.orcs),
      protectedAreaIsVisible: new UntypedFormControl(false),
      protectedAreaAdminNotes: new UntypedFormControl(this.protectedArea?.adminNotes || ''),
      protectedAreaSearchTerms: new UntypedFormControl(this.searchTerms),
    });
  }

  onSubmit() {
    const formData = this.form.value;

    const protectedAreaObj = {
      name: this.protectedArea?.displayName,
      orcs: this.protectedArea?.orcs,
      isVisible: formData.protectedAreaIsVisible,
      adminNotes: formData.protectedAreaAdminNotes,
      searchTerms: formData.protectedAreaSearchTerms,
    };
    this.displayConfirmationModal(protectedAreaObj);
  }

  submitProtectedAreaChanges(postObj) {
    this.protectedAreaService.putProtectedArea(postObj)
    this.navigateBack();
  }

  // This sends the submitted form data object to the modal for confirmation, where
  // it constructs a confirmation modal with the details of the protected area and its status.
  displayConfirmationModal(protectedAreaObj) {
    const details: ModalRowSpec[] = [
      { label: 'Name', value: this.protectedArea?.displayName },
      { label: 'Status', value: protectedAreaObj?.isVisible, eitherOr: v => v ? 'Open' : 'Closed' },
      { label: 'Visibility', value: protectedAreaObj?.isVisible, eitherOr: v => v ? 'Visible to public' : 'Not visible to public' },
      { label: 'Admin Notes', value: protectedAreaObj?.adminNotes || '(No admin notes added)' },
      { label: 'Search Terms', value: protectedAreaObj?.searchTerms.join(', ') || '(No search terms added)'},
    ];

    // Show the modal with the confirmation details.
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Confirm Park Details:',
        details,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        confirmClass: 'btn btn-primary',
        cancelClass: 'btn btn-outline-secondary'
      }
    });

    // Listen for confirmation and cancellation events from the modal.
    const modalContent = modalRef.content as ConfirmationModalComponent;
    modalContent.confirmButton.subscribe(() => {
      this.submitProtectedAreaChanges(protectedAreaObj);
      modalRef.hide();
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

  // Add search terms
  onSearchTermAdd() {
    this.searchTermExists = false;
    this.searchTermSet = this.searchTermSet?.trim();
    this.searchTermSet = this.searchTermSet?.replace(/\n/g, "");

    if (this.searchTermSet == '' || this.searchTermSet == null) return;
    const strings = this.searchTermSet?.split(',');

    if (strings.length > 1) {
      let duplicate = false;
      strings.forEach((string) => {
        string = string.trim();
        if (string && !this.searchTerms.includes(string)) {
          this.searchTerms.push(string);
        } else if (string) {
          duplicate = true;
        }
      });
      this.searchTermExists = duplicate;
      this.searchTermSet = '';
      return;
    } else {
      if (!this.searchTerms.includes(this.searchTermSet)) {
        this.searchTerms.push(this.searchTermSet);
        this.searchTermSet = '';
      } else {
        this.searchTermExists = true;
      }
    }
  }

  removeSearchTerm(index: any) {
    this.searchTerms.splice(index, 1);
  }

  navigateBack() {
    window.history.back();
  }

  onFormReset() {
    this.form.reset({
      protectedAreaName: this.protectedArea?.displayName,
      protectedAreaOrcs: this.protectedArea?.orcs,
      protectedAreaIsVisible: this.protectedArea?.isVisible,
      protectedAreaAdminNotes: this.protectedArea?.adminNotes,
      protectedAreaSearchTerms: this.protectedArea?.searchTerms,
    });
  }

  ngAfterViewChecked(): void {
    // This is a workaround to ensure change detection runs after the view has been checked.
    // Missing this check seems to be a by-product of lazy loading.
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.cdr.detectChanges();
    this.cdr.detach();
  };
}
