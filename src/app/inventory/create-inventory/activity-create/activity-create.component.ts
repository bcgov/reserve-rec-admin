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

  // Submit new activity
  async submit(): Promise<void> {
    // For creating new activities, get the values from the form instead of route data
    const collectionId = this.activity?.collectionId || this.activityForm?.get('collectionId')?.value;
    const orcs = this.activity?.orcs || this.activityForm?.get('orcs')?.value;

    if (!collectionId || !orcs) {
      console.error('Missing required collection ID or ORCS values');
      return;
    }

    const payload = this.formatFormForSubmission();

    const res = await this.activityService.createActivity(collectionId, orcs, payload);
    // get newly created activityId from response
    const activityType = res[0]?.data?.activityType;
    const activityId = res[0]?.data?.activityId;
    if (activityId) {
      this.navigateToActivity(collectionId, orcs, activityType, activityId);
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
    delete props['facility'];
    delete props['geozone'];
    
    // Assign the {pk, sk} values to the form values instead
    props['geozone'] = this.activityForm.get('geozonePkSk')?.value
    props['facilities'] = this.activityForm.get('facilityPkSk')?.value

    // Handle search terms to be a comma-separated string
    props['searchTerms'] = this.activityForm.get('searchTerms')?.value.join(',') || '';
    
    // Remove other form values that are not needed for submission
    delete props['geozonePkSk'];
    delete props['facilityPkSk'];
    delete props['protectedArea'];
    delete props['collectionId'];

    return props;
  }

  // Navigate to newly created activity
  navigateToActivity(collectionId: string, orcs: string, activityType: string, activityId: string): void {
    this.router.navigate([`/inventory/activity/${collectionId}_${orcs}/${activityType}/${activityId}`]);
    window.scrollTo(0, 0);
  }

}
