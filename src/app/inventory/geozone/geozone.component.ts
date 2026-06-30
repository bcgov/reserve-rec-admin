import { ChangeDetectorRef, Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { GeozoneService } from '../../services/geozone.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-geozone',
  imports: [RouterOutlet, UpperCasePipe, CommonModule, BreadcrumbComponent],
  templateUrl: './geozone.component.html',
  styleUrl: './geozone.component.scss',
  providers: [BsModalService],
})
export class GeozoneComponent {
  public data;

  get isEditing(): boolean { return this.router.url.endsWith('/edit'); }

  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      {
        label: this.data?.displayName || 'Geozone',
        link: this.isEditing && this.data?.collectionId && this.data?.geozoneId
          ? [`/inventory/geozone/${this.data.collectionId}/${this.data.geozoneId}`]
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
  // it constructs a confirmation modal with details and its status.
  displayConfirmationModal(collectionId, geozoneId) {
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
      this.geozoneService.deleteGeozone(collectionId, geozoneId)
      modalRef.hide();
      this.router.navigate(['/inventory']);
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

}
