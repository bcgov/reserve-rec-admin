import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Constants } from '../../app.constants';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { FacilityService } from '../../services/facility.service';
import { PermissionDirective } from '../../shared/directives/permission.directive';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-facility',
  imports: [RouterOutlet, CommonModule, PermissionDirective, BreadcrumbComponent],
  templateUrl: './facility.component.html',
  styleUrl: './facility.component.scss',
  providers: [BsModalService],
})
export class FacilityComponent {
  public data;

  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      {
        label: this.data?.displayName || 'Facility',
        link: this.isEditing && this.data?.collectionId && this.data?.facilityType && this.data?.facilityId
          ? [`/inventory/facility/${this.data.collectionId}/${this.data.facilityType}/${this.data.facilityId}`]
          : undefined,
      },
    ];
    if (this.isEditing) items.push({ label: 'Edit' });
    return items;
  }

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    private facilityService: FacilityService,
    private modalService: BsModalService,
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['facility']) {
        this.data = data?.['facility'];
      }
    });
  }
  
  get isEditing(): boolean {
    return this.router.url.endsWith('/edit');
  }

  getFacilityTypeOption() {
    return Constants.facilityTypes[this.data?.facilityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getFacilitySubTypeOption() {
    return Constants.facilityTypes[this.data?.facilityType]?.subTypes?.[this.data?.facilitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  navToEdit() {
    if (this.data?.collectionId && this.data?.facilityType && this.data?.facilityId) {
      this.router.navigate([`/inventory/facility/${this.data.collectionId}/${this.data.facilityType}/${this.data.facilityId}/edit`]);
    }
    this.cdr.detectChanges();
  }

  onDelete() {
    const collectionId = this.data?.collectionId;
    const facilityType = this.data?.facilityType;
    const facilityId = this.data?.facilityId;

    this.displayConfirmationModal(collectionId, facilityType, facilityId);
  }

  // This sends the submitted form data object to the modal for confirmation, where
  // it constructs a confirmation modal with details and its status.
  displayConfirmationModal(collectionId, facilityType, facilityId) {
    // Show the modal with the confirmation details.
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      class: 'modal-dialog-centered delete-confirmation-modal',
      initialState: {
        title: `Delete ${this.data?.displayName}?`,
        body: 'Deleting an inventory item will remove all associated data. Linked items will be unaffected. Are you sure you want to proceed?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmClass: 'btn btn-danger',
        cancelClass: 'btn btn-outline-secondary'
      }
    });

    // Listen for confirmation and cancellation events from the modal.
    const modalContent = modalRef.content as ConfirmationModalComponent;
    modalContent.confirmButton.subscribe(() => {
      this.facilityService.deleteFacility(collectionId, facilityType, facilityId)
      modalRef.hide();
      this.router.navigate(['/inventory']);
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

}
