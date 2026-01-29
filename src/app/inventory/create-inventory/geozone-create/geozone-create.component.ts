import {  Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { GeozoneService } from '../../../services/geozone.service';
import { Router } from '@angular/router';
import { GeozoneFormComponent } from '../../geozone/geozone-form/geozone-form.component';

@Component({
  selector: 'app-geozone-create',
  imports: [GeozoneFormComponent],
  templateUrl: './geozone-create.component.html',
  styleUrl: './geozone-create.component.scss'
})
export class GeozoneCreateComponent {
  public geozoneForm: UntypedFormGroup;

  // Track relationships for creation
  public existingFacilities: any[] = [];
  public existingActivities: any[] = [];

  constructor(
    protected geozoneService: GeozoneService,
    protected router: Router,
  ) { }

  updateGeozoneForm(event) {
    this.geozoneForm = event;
  }

  /**
   * Called when relationships change (user adds/removes entities)
   * For create, we just track what's selected
   */
  onRelationshipsChanged(type: string, relationships: any[]) {
    if (type === 'facilities') {
      this.existingFacilities = [...relationships];
      // Update form control to include relationship data
      this.geozoneForm.get('facilities')?.setValue(relationships.map(f => ({ pk: f.pk, sk: f.sk })));
    } else if (type === 'activities') {
      this.existingActivities = [...relationships];
      // Update form control to include relationship data
      this.geozoneForm.get('activities')?.setValue(relationships.map(a => ({ pk: a.pk, sk: a.sk })));
    }
  }

  async submit() {
    const collectionId = this.geozoneForm.get('collectionId').value;
    const props = this.formatFormForSubmission();
    const res = await this.geozoneService.createGeozone(collectionId, props);
    // get newly created geozoneId from response
    const geozoneId = res[0]?.data?.geozoneId;
    if (geozoneId) {
      this.navigateToGeozone(collectionId, geozoneId);
    }
  }

  formatFormForSubmission() {
    const fields = this.geozoneForm.value;
    const mandatoryFields = this.geozoneForm.get('mandatoryFields').value;
    const props = { ...mandatoryFields, ...fields };
    props.location = {
      type: 'point',
      coordinates: [mandatoryFields.location.longitude, mandatoryFields.location.latitude]
    };
    props.envelope = {
      type: 'envelope',
      coordinates: [
        [mandatoryFields.envelope.northwest.longitude, mandatoryFields.envelope.northwest.latitude],
        [mandatoryFields.envelope.southeast.longitude, mandatoryFields.envelope.southeast.latitude]]
    };

    // Handle search terms
    props['searchTerms'] = this.geozoneForm.get('searchTerms')?.value || [];

    delete props.collectionId; // Remove collectionId from the props
    delete props.enforceZoomVisibility; // Remove enforceZoomVisibility from the props
    delete props.mandatoryFields; // Remove mandatoryFields from the props
    
    // Include relationships for POST handler
    // The form controls already have the right format from onRelationshipsChanged
    return props;
  }

  navigateToGeozone(collectionId, geozoneId) {
    this.router.navigate([`/inventory/geozone/${collectionId}/${geozoneId}`]).then(() => {
      window.scrollTo(0, 0);
      window.location.reload();
    });
  }
}
