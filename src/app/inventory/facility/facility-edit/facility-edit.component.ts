import { ChangeDetectorRef, Component } from '@angular/core';
import { FacilityFormComponent } from '../facility-form/facility-form.component';
import { FacilityService } from '../../../services/facility.service';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-facility-edit',
  imports: [FacilityFormComponent],
  templateUrl: './facility-edit.component.html',
  styleUrl: './facility-edit.component.scss'
})
export class FacilityEditComponent {
  public facilityForm;
  public facility;
  
  // Track initial state for relationship diffing
  public initialActivities: any[] = [];
  public initialGeozones: any[] = [];
  
  // Current state (updated as user edits)
  public existingActivities: any[] = [];
  public existingGeozones: any[] = [];

  constructor(
    protected facilityService: FacilityService,
    protected relationshipService: RelationshipService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cdr: ChangeDetectorRef
  ) {
    if (this.route.parent?.snapshot.data['facility']) {
      this.facility = this.route.parent?.snapshot.data['facility'];
    }
  }

    updateFacilityForm(event) {
    this.facilityForm = event;
  }

  /**
   * Called by child component when relationships are initially loaded
   * Captures the initial state for diffing later
   */
  onRelationshipsLoaded(type: string, relationships: any[]) {
    if (type === 'activities') {
      this.initialActivities = [...relationships];
      this.existingActivities = [...relationships];
    } else if (type === 'geozones') {
      this.initialGeozones = [...relationships];
      this.existingGeozones = [...relationships];
    }
  }

  /**
   * Called when relationships change (user adds/removes entities)
   * Updates the current state for diffing
   */
  onRelationshipsChanged(type: string, relationships: any[]) {
    if (type === 'activities') {
      this.existingActivities = [...relationships];
    } else if (type === 'geozones') {
      this.existingGeozones = [...relationships];
    }
  }

  async submit() {
    const collectionId = this.facility?.collectionId;
    const facilityType = this.facility?.facilityType;
    const facilityId = this.facility?.facilityId;
    const props = this.formatFormForSubmission();
    
    // Step 1: Update the facility entity itself
    const res = await this.facilityService.updateFacility(collectionId, facilityType, facilityId, props);
    
    if (res) {
      // Step 2: Sync relationships (handles additions and deletions)
      await this.synchronize();
      
      // Step 3: Navigate to the updated facility
      this.navigateToFacility(collectionId, facilityType, facilityId);
    }
  }

  /**
   * Sync relationship changes with the backend
   * Compares initial state vs current state and creates/deletes as needed
   */
  async synchronize() {
    if (!this.facility?.pk || !this.facility?.sk) {
      console.warn('Cannot sync relationships: facility missing pk or sk');
      return;
    }

    const sourceEntity = {
      schema: 'facility',
      pk: this.facility.pk,
      sk: this.facility.sk
    };

    try {
      // Sync activity relationships
      await this.relationshipService.syncRelationships(
        sourceEntity,
        this.initialActivities,
        this.existingActivities
      );
      console.log('Activity relationships synced successfully');

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
    const props = Object.entries(this.facilityForm.controls).map(([key, control]) => {
      if (control['dirty']){
        return {
          [key]: control['value']
        }
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});
    
    if (props?.['location']) {
      const location = this.facilityForm?.get('location').value;
      props['location'] = {
        type: 'point',
        coordinates: [location.longitude, location.latitude]
      };
    };

    // Handle search terms
    props['searchTerms'] = this.facilityForm.get('searchTerms')?.value || [];

    // Delete relationship form values
    delete props['activities'];
    delete props['geozones'];
    
    delete props['collectionId']; // Remove collectionId from the props
    delete props['meta']; // Remove meta fields from the props
    return props;
  }

  navigateToFacility(collectionId, facilityType, facilityId) {
    this.router.navigate([`/inventory/facility/${collectionId}/${facilityType}/${facilityId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
      window.location.reload();
    });
  }
}
