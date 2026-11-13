import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivityFormComponent } from '../activity-form/activity-form.component';
import { ActivityService } from '../../../services/activity.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-activity-edit',
  imports: [ActivityFormComponent],
  templateUrl: './activity-edit.component.html',
  styleUrl: './activity-edit.component.scss'
})
export class ActivityEditComponent {
  public activityForm;
  public activity;

  constructor(
    protected activityService: ActivityService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cdr: ChangeDetectorRef
  ) {
    if (this.route.parent?.snapshot.data['activity']) {
      this.activity = this.route.parent?.snapshot.data['activity'];
    }
  }

  updateActivityForm(event) {
    this.activityForm = event;
  }

  // Submit updated activity
  async submit(): Promise<void> {
    // For creating new activities, get the values from the form instead of route data
    const collectionId = this.activity?.collectionId || this.activityForm?.get('collectionId')?.value;
    const activityType = this.activity?.activityType || this.activityForm?.get('activityType')?.value;
    const activityId = this.activity?.activityId || this.activityForm?.get('activityId')?.value;

    if (!collectionId || !activityType || !activityId) {
      console.error('Missing required collection ID, activityType, or activityId values');
      return;
    }

    const payload = this.formatFormForSubmission();

    const res = await this.activityService.updateActivity(collectionId, activityType, activityId, payload);

    if (res) {
      this.navigateToActivity(collectionId, activityType, activityId);
    }
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const props = Object.entries(this.activityForm.controls).map(([key, control]) => {
      if (control['dirty']) {
        return {
          [key]: control['value']
        };
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});

    // Handle search terms
    props['searchTerms'] = this.activityForm.get('searchTerms')?.value || [];

    // Remove other form values that are not needed for submission
    delete props['collectionId'];

    return props;
  }

  // Navigate to updated activity
  navigateToActivity(collectionId, activityType, activityId) {
    this.router.navigate([`/inventory/activity/${collectionId}/${activityType}/${activityId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
    });
  }
}
