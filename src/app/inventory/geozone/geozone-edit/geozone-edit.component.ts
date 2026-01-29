import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { GeozoneFormComponent } from '../geozone-form/geozone-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { GeozoneService } from '../../../services/geozone.service';
import { RelationshipService } from '../../../services/relationship.service';

@Component({
  selector: 'app-geozone-edit',
  imports: [GeozoneFormComponent],
  templateUrl: './geozone-edit.component.html',
  styleUrl: './geozone-edit.component.scss'
})
export class GeozoneEditComponent {
  public geozoneForm: UntypedFormGroup;
  public geozone;

  // Track initial state for relationship diffing
  public initialFacilities: any[] = [];
  public initialActivities: any[] = [];
  
  // Current state (updated as user edits)
  public existingFacilities: any[] = [];
  public existingActivities: any[] = [];

  constructor(
    protected geozoneService: GeozoneService,
    protected relationshipService: RelationshipService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cdr: ChangeDetectorRef
  ) {
    if (this.route.parent?.snapshot.data['geozone']) {
      this.geozone = this.route.parent?.snapshot.data['geozone'];
    }
  }

  updateGeozoneForm(event) {
    this.geozoneForm = event;
  }

  /**
   * Called by child component when relationships are initially loaded
   * Captures the initial state for diffing later
   */
  onRelationshipsLoaded(type: string, relationships: any[]) {
    if (type === 'facilities') {
      this.initialFacilities = [...relationships];
      this.existingFacilities = [...relationships];
    } else if (type === 'activities') {
      this.initialActivities = [...relationships];
      this.existingActivities = [...relationships];
    }
  }

  /**
   * Called when relationships change (user adds/removes entities)
   * Updates the current state for diffing
   */
  onRelationshipsChanged(type: string, relationships: any[]) {
    if (type === 'facilities') {
      this.existingFacilities = [...relationships];
    } else if (type === 'activities') {
      this.existingActivities = [...relationships];
    }
  }

  async submit() {
    const collectionId = this.geozone?.collectionId;
    const geozoneId = this.geozone?.geozoneId;
    const props = this.formatFormForSubmission();
    
    // Step 1: Update the geozone entity itself
    const res = await this.geozoneService.updateGeozone(collectionId, geozoneId, props);
    
    if (res) {
      // Step 2: Sync relationships (handles additions and deletions)
      await this.synchronize();
      
      // Step 3: Navigate to the updated geozone
      this.navigateToGeozone(collectionId, geozoneId);
    }
  }

  /**
   * Sync relationship changes with the backend
   * Compares initial state vs current state and creates/deletes as needed
   */
  async synchronize() {
    if (!this.geozone?.pk || !this.geozone?.sk) {
      console.warn('Cannot sync relationships: geozone missing pk or sk');
      return;
    }

    const sourceEntity = {
      schema: 'geozone',
      pk: this.geozone.pk,
      sk: this.geozone.sk
    };

    try {
      // Sync facility relationships
      await this.relationshipService.syncRelationships(
        sourceEntity,
        this.initialFacilities,
        this.existingFacilities,
      );
      console.log('Facility relationships synced successfully');

      // Sync activity relationships
      await this.relationshipService.syncRelationships(
        sourceEntity,
        this.initialActivities,
        this.existingActivities,
      );
      console.log('Activity relationships synced successfully');
    } catch (error) {
      console.error('Error syncing relationships:', error);
      throw error;
    }
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const rootProps = Object.entries(this.geozoneForm.controls).filter(([key, control]) => control.dirty);
    const mandatoryProps = Object.entries(this.geozoneForm.get('mandatoryFields')['controls']).filter(([key, control]) => control['dirty']);
    const props = [...rootProps, ...mandatoryProps].reduce((acc, [key, control]) => ({...acc, [key]: control?.['value'] || control}), {});
    const mandatoryFields = this.geozoneForm.get('mandatoryFields').value;
    if (props?.['location']) {
      props['location'] = {
        type: 'point',
        coordinates: [mandatoryFields.location.longitude, mandatoryFields.location.latitude]
      };
    };
    if (props?.['envelope']) {
      props['envelope'] = {
        type: 'envelope',
        coordinates: [
          [mandatoryFields.envelope.northwest.longitude, mandatoryFields.envelope.northwest.latitude],
          [mandatoryFields.envelope.southeast.longitude, mandatoryFields.envelope.southeast.latitude]
        ]
      };
    }
 
    // Handle search terms
    props['searchTerms'] = this.geozoneForm.get('searchTerms')?.value || [];

    delete props['collectionId']; // Remove collectionId from the props
    delete props['enforceZoomVisibility']; // Remove enforceZoomVisibility from the props
    delete props['mandatoryFields']; // Remove mandatoryFields from the props
    delete props['facilities']; // Remove facilities from the props (handled by sync)
    delete props['activities']; // Remove activities from the props (handled by sync)
    return props;
  }

  getDirtyProps(props, controls) {
    for (const key in controls) {
      if (controls[key].controls) {
        props[key] = {};
        this.getDirtyProps(props[key], controls[key].controls);
      }
      if (controls[key]?.dirty) {
        props[key] = controls[key].value;
      }
    }
  }



  navigateToGeozone(collectionId, geozoneId) {
    this.router.navigate([`/inventory/geozone/${collectionId}/${geozoneId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
      window.location.reload();
    });
  }
}
