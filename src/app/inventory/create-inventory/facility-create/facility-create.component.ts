import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { FacilityService } from '../../../services/facility.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilityFormComponent } from '../../facility/facility-form/facility-form.component';

@Component({
  selector: 'app-facility-create',
  imports: [FacilityFormComponent],
  templateUrl: './facility-create.component.html',
  styleUrl: './facility-create.component.scss'
})
export class FacilityCreateComponent {
  public facilityForm: UntypedFormGroup;
  public facility;

  constructor(
    protected facilityService: FacilityService,
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute
  ) {
    if (this.route.parent?.snapshot.data['facility']) {
      this.facility = this.route.parent?.snapshot.data['facility'];
    }
  }

  updateFacilityForm(event) {
    this.facilityForm = event;
  }

  onRelationshipsChanged(type: string, relationships: any[]) {
    console.log(`Relationships changed for ${type}:`, relationships);
    // Update form controls directly - the form already tracks these
    if (type === 'activities') {
      this.facilityForm?.get('activities')?.setValue(relationships);
      this.facilityForm?.get('activities')?.markAsDirty();
    } else if (type === 'geozones') {
      this.facilityForm?.get('geozones')?.setValue(relationships);
      this.facilityForm?.get('geozones')?.markAsDirty();
    }
  }

  async submit() {
    const collectionId = this.facilityForm.get('collectionId').value || this.facility?.collectionId;
    const facilityType = this.facilityForm.get('facilityType').value || this.facility?.facilityType;

    if (!collectionId || !facilityType) {
      console.error('Missing required collection ID or facility type');
      return;
    }

    const props = this.formatFormForSubmission();
    
    const res = await this.facilityService.createFacility(collectionId, facilityType, props);

    const facilityId = res[0]?.data?.facilityId;
    if (facilityId) {
      this.navigateToFacility(collectionId, facilityType, facilityId);
    }
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const props = Object.entries(this.facilityForm.controls).map(([key, control]) => {
      if (control['dirty']) {
        return {
          [key]: control['value']
        };
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
