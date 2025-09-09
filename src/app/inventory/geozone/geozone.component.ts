import { ChangeDetectorRef, Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { ModalRowSpec } from '../../shared/components/search-terms/search-terms.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { GeozoneService } from '../../services/geozone.service';

@Component({
  selector: 'app-geozone',
  imports: [RouterOutlet, UpperCasePipe, CommonModule],
  templateUrl: './geozone.component.html',
  styleUrl: './geozone.component.scss',
  providers: [BsModalService],
})
export class GeozoneComponent {
  public data;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    private geozoneService: GeozoneService,
    private modalService: BsModalService,
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['geozone']) {
        this.data = data?.['geozone'];
      }
    });
  }

  navToEdit() {
    if (this.data?.collectionId && this.data?.geozoneId) {
      this.router.navigate([`/inventory/geozone/${this.data.collectionId}/${this.data.geozoneId}/edit`]);
    }
    this.cdr.detectChanges();
  }

  onDelete() {
    const collectionId = this.data?.collectionId;
    const geozoneId = this.data?.geozoneId;

    this.displayConfirmationModal(collectionId, geozoneId);
  }

  // This sends the submitted form data object to the modal for confirmation, where
  // it constructs a confirmation modal with the details of the protected area and its status.
  displayConfirmationModal(collectionId, geozoneId) {
    const details: ModalRowSpec[] = [
      { label: 'Geozone Name', value: this.data?.displayName },
      { label: 'Geozone Collection ID', value: collectionId },
      { label: 'Geozone ID', value: geozoneId }
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
      this.geozoneService.deleteGeozone(collectionId, geozoneId)
      modalRef.hide();
      this.router.navigate(['/inventory']);
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

}
