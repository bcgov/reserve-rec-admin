import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Constants } from '../../app.constants';
import { ModalRowSpec } from '../../shared/components/search-terms/search-terms.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { FacilityService } from '../../services/facility.service';

@Component({
  selector: 'app-facility',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './facility.component.html',
  styleUrl: './facility.component.scss',
  providers: [BsModalService],
})
export class FacilityComponent {
  public data;

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
  // it constructs a confirmation modal with the details of the protected area and its status.
  displayConfirmationModal(collectionId, facilityType, facilityId) {
    const details: ModalRowSpec[] = [
      { label: 'Facility Name', value: this.data?.displayName },
      { label: 'Facility Collection ID', value: collectionId },
      { label: 'Facility Type', value: this.getFacilityTypeOption()?.display },
      { label: 'Facility ID', value: facilityId }
    ];

    // Show the modal with the confirmation details.
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Confirm Delete',
        details,
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
