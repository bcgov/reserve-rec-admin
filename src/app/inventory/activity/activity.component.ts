import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Constants } from '../../app.constants';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ModalRowSpec } from '../../shared/components/search-terms/search-terms.component';
import { ActivityService } from '../../services/activity.service';

@Component({
  selector: 'app-activity',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss',
  providers: [BsModalService]
})
export class ActivityComponent implements OnDestroy {
  public data;
  private subscription: Subscription;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    private activityService: ActivityService,
    private modalService: BsModalService
  ) {
    this.subscription = this.route.data.subscribe((data) => {
      if (data?.['activity']) {
        this.data = data?.['activity'];
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getActivityTypeOption() {
    return Constants.activityTypes[this.data?.activityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getActivitySubTypeOption() {
    const activityType = Constants.activityTypes[this.data?.activityType];
    return activityType?.subTypes?.[this.data?.activitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  navToEdit() {
    if (this.data?.acCollectionId && this.data?.activityType && this.data?.activityId) {
      this.router.navigate([`/inventory/activity/${this.data.acCollectionId}/${this.data.activityType}/${this.data.activityId}/edit`]);
    }
    this.cdr.detectChanges();
  }

  navToDelete() {
    if (this.data?.acCollectionId && this.data?.activityType && this.data?.activityId) {
      this.router.navigate([`/inventory/activity/${this.data.acCollectionId}/${this.data.activityType}/${this.data.activityId}/delete`]);
    }
    this.cdr.detectChanges();
  }

  onDelete() {
    const acCollectionId = this.data?.acCollectionId;
    const activityType = this.data?.activityType;
    const activityId = this.data?.activityId;

    this.displayConfirmationModal(acCollectionId, activityType, activityId);
  }

  // This sends the submitted form data object to the modal for confirmation, where
  // it constructs a confirmation modal with the details of the protected area and its status.
  displayConfirmationModal(acCollectionId, activityType, activityId) {
    const details: ModalRowSpec[] = [
      { label: 'Activity Name', value: this.data?.displayName },
      { label: 'Activity Type', value: this.getActivityTypeOption()?.display },
      { label: 'Activity Sub-Type', value: this.getActivitySubTypeOption()?.display },
      { label: 'Activity ID', value: activityId }
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
      this.activityService.deleteActivity(acCollectionId, activityType, activityId)
      modalRef.hide();
      this.router.navigate(['/inventory']);
    });
    modalContent.cancelButton.subscribe(() => {
      modalRef.hide();
    });
  }
}
