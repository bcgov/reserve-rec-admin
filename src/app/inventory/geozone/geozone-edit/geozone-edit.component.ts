import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { GeozoneFormComponent } from '../geozone-form/geozone-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { GeozoneService } from '../../../services/geozone.service';

@Component({
  selector: 'app-geozone-edit',
  imports: [GeozoneFormComponent],
  templateUrl: './geozone-edit.component.html',
  styleUrl: './geozone-edit.component.scss'
})
export class GeozoneEditComponent {
  public geozoneForm: UntypedFormGroup;
  public geozone;

  constructor(
    protected geozoneService: GeozoneService,
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

  async submit() {
    const collectionId = this.geozone?.gzCollectionId;
    const geozoneId = this.geozone?.geozoneId;
    const props = this.formatFormForSubmission();
    const res = await this.geozoneService.updateGeozone(collectionId, geozoneId, props);
    // get newly created geozoneId from response
    this.navigateToGeozone(collectionId, geozoneId);
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const rootProps = Object.entries(this.geozoneForm.controls).filter(([key, control]) => control.dirty);
    const mandatoryProps = Object.entries(this.geozoneForm.get('mandatoryFields')['controls']).filter(([key, control]) => control['dirty']);
    const props = [...rootProps, ...mandatoryProps].reduce((acc, [key, control]) => ({...acc, [key]: control}), {});
    const mandatoryFields = this.geozoneForm.get('mandatoryFields').value;
    this.getDirtyProps(props, this.geozoneForm.controls);
    this.getDirtyProps(mandatoryProps, this.geozoneForm.get('mandatoryFields')['controls']);

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
    delete props['gzCollectionId']; // Remove gzCollectionId from the props
    delete props['enforceZoomVisibility']; // Remove enforceZoomVisibility from the props
    delete props['mandatoryFields']; // Remove location from the props
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



  navigateToGeozone(gzCollectionId, geozoneId) {
    this.router.navigate([`/inventory/geozone/${gzCollectionId}/${geozoneId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges();
      window.location.reload();
    });
  }
}
