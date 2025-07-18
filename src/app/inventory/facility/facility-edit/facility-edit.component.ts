import { ChangeDetectorRef, Component } from '@angular/core';
import { FacilityFormComponent } from '../facility-form/facility-form.component';
import { FacilityService } from '../../../services/facility.service';
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

  constructor(
    protected facilityService: FacilityService,
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

    async submit() {
    const collectionId = this.facility?.fcCollectionId;
    const facilityType = this.facility?.facilityType;
    const facilityId = this.facility?.facilityId;
    const props = this.formatFormForSubmission();
    const res = await this.facilityService.updateFacility(collectionId, facilityType, facilityId, props);
    this.navigateToFacility(collectionId, facilityType, facilityId);
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
    delete props['fcCollectionId']; // Remove gzCollectionId from the props
    delete props['meta']; // Remove meta fields from the props
    return props;
  }

  navigateToFacility(fcCollectionId, facilityType, facilityId) {
    this.router.navigate([`/inventory/facility/${fcCollectionId}/${facilityType}/${facilityId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
      window.location.reload();
    });
  }


}
