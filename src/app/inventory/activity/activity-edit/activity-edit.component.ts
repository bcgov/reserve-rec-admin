import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivityFormComponent } from '../activity-form/activity-form.component';
import { ActivityService } from '../../../services/activity.service';
import { RelationshipService } from '../../../services/relationship.service';
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
  
  // Track initial state for relationship diffing
  public initialFacilities: any[] = [];
  public initialGeozones: any[] = [];
  
  // Current state (updated as user edits)
  public existingFacilities: any[] = [];
  public existingGeozones: any[] = [];

  constructor(
    protected activityService: ActivityService,
    protected relationshipService: RelationshipService,
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

  /**
   * Called by child component when relationships are initially loaded
   * Captures the initial state for diffing later
   */
  onRelationshipsLoaded(type: string, relationships: any[]) {
    if (type === 'facilities') {
      this.initialFacilities = [...relationships];
      this.existingFacilities = [...relationships];
    } else {
      this.initialGeozones = [...relationships];
      this.existingGeozones = [...relationships];
    }
  }

  /**
   * Called when relationships change (user adds/removes entities)
   * Updates the current state for diffing
   */
  onRelationshipsChanged(type: string, relationships: any[]) {
    if (type === 'facilities') {
      this.existingFacilities = [...relationships];
    } else {
      this.existingGeozones = [...relationships];
    }
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

    // Step 1: Update the activity entity itself
    const res = await this.activityService.updateActivity(collectionId, activityType, activityId, payload);
    
    if (res) {
      // Step 2: Sync relationships (handles additions and deletions)
      await this.synchronize();
      
      // Step 3: Navigate to the updated activity
      this.navigateToActivity(collectionId, activityType, activityId);
    }
  }

  /**
   * Sync relationship changes with the backend
   * Compares initial state vs current state and creates/deletes as needed
   */
  async synchronize() {
    if (!this.activity?.pk || !this.activity?.sk) {
      console.warn('Cannot sync relationships: activity missing pk or sk');
      return;
    }

    const sourceEntity = {
      schema: 'activity',
      pk: this.activity.pk,
      sk: this.activity.sk
    };

    // Get the difference between the initial and existing facilities
    const facilitiesDiff = {
      toAdd: this.existingFacilities.filter(
        existing => !this.initialFacilities.some(
          initial => initial.pk === existing.pk && initial.sk === existing.sk
        )
      ),
      toRemove: this.initialFacilities.filter(
        initial => !this.existingFacilities.some(
          existing => existing.pk === initial.pk && existing.sk === initial.sk
        )
      )
    };
    
    // Get the difference between the initial and existing geozones
    const geozonesDiff = {
      toAdd: this.existingGeozones.filter(
        existing => !this.initialGeozones.some(
          initial => initial.pk === existing.pk && initial.sk === existing.sk
        )
      ),
      toRemove: this.initialGeozones.filter(
        initial => !this.existingGeozones.some(
          existing => existing.pk === initial.pk && existing.sk === initial.sk
        )
      )
    };

    try {
      // Sync facility relationships
      await this.relationshipService.syncRelationships(
        sourceEntity,
        this.initialFacilities,
        this.existingFacilities
      );
      console.log('Facility relationships synced successfully');

      // Sync geozone relationships
      await this.relationshipService.syncRelationships(
        sourceEntity,
        this.initialGeozones,
        this.existingGeozones
      );
      console.log('Geozone relationships synced successfully');
    } catch (error) {
      console.error('Error syncing relationships:', error);
      throw error;
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

    // Delete facility and geozone form values that aren't a {pk, sk} pair

    delete props['facilities'];
    delete props['geozones'];

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
