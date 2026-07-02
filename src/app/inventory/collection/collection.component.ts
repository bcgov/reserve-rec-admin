import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { CollectionService } from '../../services/collection.service';
import { PermissionDirective } from '../../shared/directives/permission.directive';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-collection',
  imports: [RouterOutlet, CommonModule, PermissionDirective, BreadcrumbComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss',
  providers: [BsModalService],
})
export class CollectionComponent {
  public data;

  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      { label: this.data?.displayName || 'Collection', link: this.isEditing && this.data?.collectionId ? [`/inventory/collection/${this.data.collectionId}`] : undefined },
    ];
    if (this.isEditing) items.push({ label: 'Edit' });
    return items;
  }

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    private collectionService: CollectionService,
    private modalService: BsModalService,
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['collection']) {
        this.data = data?.['collection'];
      }
    });
  }
  
  get isEditing(): boolean {
    return this.router.url.endsWith('/edit');
  }

  navToEdit() {
    if (this.data?.collectionId) {
      this.router.navigate([`/inventory/collection/${this.data.collectionId}/edit`]);
    }
    this.cdr.detectChanges();
  }

  onDelete() {
    const collectionId = this.data?.collectionId;

    this.displayConfirmationModal(collectionId);
  }

  // This sends the submitted form data object to the modal for confirmation, where
  // it constructs a confirmation modal with details and its status.
  displayConfirmationModal(collectionId) {
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
      this.collectionService.deleteCollection(collectionId)
      modalRef.hide();
      this.router.navigate(['/inventory']);
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

}
