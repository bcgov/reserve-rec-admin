import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { ActivityService } from '../../../services/activity.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivityFormComponent } from '../../activity/activity-form/activity-form.component';

@Component({
  selector: 'app-activity-create',
  imports: [ActivityFormComponent],
  templateUrl: './activity-create.component.html',
  styleUrl: './activity-create.component.scss'
})
export class ActivityCreateComponent {
  public activityForm: UntypedFormGroup;
  public activity;

  constructor(
    protected activityService: ActivityService,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute
  ) {
    if (this.route.parent?.snapshot.data['activity']) {
      this.activity = this.route.parent?.snapshot.data['activity'];
    }
  }

  updateActivityForm(event) {
    this.activityForm = event;
  }

  onRelationshipsChanged(type: string, relationships: any[]) {
    console.log(`Relationships changed for ${type}:`, relationships);
    // Update form controls directly - the form already tracks these
    if (type === 'facilities') {
      this.activityForm?.get('facilities')?.setValue(relationships);
      this.activityForm?.get('facilities')?.markAsDirty();
    } else if (type === 'geozones') {
      this.activityForm?.get('geozones')?.setValue(relationships);
      this.activityForm?.get('geozones')?.markAsDirty();
    }
  }

  // Submit new activity
  async submit(): Promise<void> {
    // For creating new activities, use .get to get the values from the form instead of route data
    const collectionId = this.activity?.collectionId || this.activityForm?.get('collectionId')?.value;
    const activityType = this.activity?.activityType || this.activityForm?.get('activityType')?.value;

    if (!collectionId || !activityType) {
      console.error('Missing required collection ID or ORCS values');
      return;
    }

    const payload = this.formatFormForSubmission();
    const res = await this.activityService.createActivity(collectionId, payload);

    // get newly created activityId from response
    const activityId = res[0]?.data?.activityId;
    if (activityId) {
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

    // Remove form values that are not needed for submission
    delete props['collectionId'];

    return props;
  }

  // Navigate to newly created activity
  navigateToActivity(collectionId: string, activityType: string, activityId: string): void {
    this.router.navigate([`/inventory/activity/${collectionId}/${activityType}/${activityId}`]);
    window.scrollTo(0, 0);
  }

}
