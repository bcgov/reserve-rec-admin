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

  // Submit new activity
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
    // get newly created activityId from response
    if (res?.activityId) {
      this.navigateToActivity(collectionId, activityType, res?.activityId);
    }
  }

  formatFormForSubmission() {
    console.log('Form controls:', Object.keys(this.activityForm.controls));
    console.log('Form values:', this.activityForm.value);

    // Get all dirty controls by recursion
    const props = Object.entries(this.activityForm.controls).map(([key, control]) => {
      console.log(`Control ${key}: dirty=${control['dirty']}, value=`, control['value']);
      if (control['dirty']) {
        return {
          [key]: control['value']
        };
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});

    // Delete facility and geozone form values that aren't a {pk, sk} pair
    delete props['allFacilities'];
    delete props['allGeozones'];

    // Handle search terms to be a comma-separated string
    if (this.activityForm.get('searchTerms')?.value) {
      props['searchTerms'] = this.activityForm.get('searchTerms')?.value?.join(',') || '';
    }

    // Remove other form values that are not needed for submission
    delete props['collectionId'];

    return props;
  }

  // Navigate to newly created activity
  navigateToActivity(collectionId, activityType, activityId) {
    this.router.navigate([`/inventory/activity/${collectionId}/${activityType}/${activityId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
      // window.location.reload();
    });
  }
}
