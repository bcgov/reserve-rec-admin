import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Constants } from '../../app.constants';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ProductService } from '../../services/product.service';
import { PermissionDirective } from '../../shared/directives/permission.directive';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-product',
  imports: [RouterOutlet, CommonModule, PermissionDirective, BreadcrumbComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
  providers: [BsModalService],
})
export class ProductComponent {
  public data;

  get breadcrumbs(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      { label: 'Inventory', link: ['/inventory'] },
      {
        label: this.data?.displayName || 'Product',
        link: this.isEditing && this.data?.collectionId && this.data?.activityType && this.data?.activityId && this.data?.productId
          ? [`/inventory/product/${this.data.collectionId}/${this.data.activityType}/${this.data.activityId}/${this.data.productId}`]
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
    private productService: ProductService,
    private modalService: BsModalService,
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['product']) {
        this.data = data?.['product'];
      }
    });
  }

  get isEditing(): boolean {
    return this.router.url.endsWith('/edit');
  }

  getActivityTypeOption() {
    return Constants.activityTypes[this.data?.activityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getActivitySubTypeOption() {
    return Constants.activityTypes[this.data?.activityType]?.subTypes?.[this.data?.activitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  navToEdit() {
    if (this.data?.collectionId && this.data?.activityType && this.data?.activityId && this.data?.productId) {
      this.router.navigate([`/inventory/product/${this.data.collectionId}/${this.data.activityType}/${this.data.activityId}/${this.data.productId}/edit`]);
    }
    this.cdr.detectChanges();
  }

  onDelete() {
    const collectionId = this.data?.collectionId;
    const activityType = this.data?.activityType;
    const activityId = this.data?.activityId;
    const productId = this.data?.productId;

    this.displayConfirmationModal(collectionId, activityType, activityId, productId);
  }

  // This sends the submitted form data object to the modal for confirmation, where
  // it constructs a confirmation modal with details and its status.
  displayConfirmationModal(collectionId, activityType, activityId, productId) {
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
      this.productService.deleteProduct(collectionId, activityType, activityId, productId)
      modalRef.hide();
      this.router.navigate(['/inventory']);
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }

}
