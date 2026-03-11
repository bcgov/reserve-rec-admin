import { AfterViewChecked, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FacilityFormComponent } from '../facility-form/facility-form.component';
import { FacilityService } from '../../../services/facility.service';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityEditBaseComponent } from '../../../shared/components/entity/entity-base/entity-edit-base.component';

@Component({
  selector: 'app-facility-edit',
  imports: [FacilityFormComponent],
  templateUrl: './facility-edit.component.html',
  styleUrl: './facility-edit.component.scss'
})
export class FacilityEditComponent extends EntityEditBaseComponent implements AfterViewChecked {
  @ViewChild(FacilityFormComponent) facilityFormComponent!: FacilityFormComponent;

  public facilityForm;
  public facility;

  constructor(
    protected facilityService: FacilityService,
    relationshipService: RelationshipService,
    router: Router,
    route: ActivatedRoute,
    cdr: ChangeDetectorRef
  ) {
    super(relationshipService, router, route, cdr);
    if (this.route.parent?.snapshot.data['facility']) {
      this.facility = this.route.parent?.snapshot.data['facility'];
    }
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
  }

  updateFacilityForm(event) {
    this.facilityForm = event;
  }

  get isEditing(): boolean {
    return this.router.url.endsWith('/edit');
  }

  async submit() {
    this.facilityForm.markAllAsTouched();

    if (this.facilityForm.invalid) {
      return;
    }

    const collectionId = this.facility?.collectionId;
    const facilityType = this.facility?.facilityType;
    const facilityId = this.facility?.facilityId;
    const props = this.formatFormForSubmission();

    const res = await this.facilityService.updateFacility(collectionId, facilityType, facilityId, props);

    if (res) {
      for (const [type] of this.initialRelationships) {
        const desired = this.facilityFormComponent.getSelectedForType(type);
        this.currentRelationships.set(type, [...desired]);
      }

      await this.synchronize();

      this.navigateToFacility(collectionId, facilityType, facilityId);
    }
  }

  async synchronize() {
    if (!this.facility?.pk || !this.facility?.sk) {
      console.warn('Cannot sync relationships: facility missing pk or sk');
      return;
    }
    await this.synchronizeAll({ schema: 'facility', pk: this.facility.pk, sk: this.facility.sk });
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const props = Object.entries(this.facilityForm.controls).map(([key, control]) => {
      if (control['dirty']) {
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

    // Delete relationship form values (managed by RelationshipService post-submit)
    delete props['activities'];
    delete props['geozones'];
    delete props['collectionId']; // Remove collectionId from the props
    delete props['meta']; // Remove meta fields from the props
    return props;
  }

  resetForm() {
    this.facilityFormComponent.resetToFacility(this.facility, this.initialRelationships);
    for (const [type, items] of this.initialRelationships) {
      this.currentRelationships.set(type, [...items]);
    }
  }

  cancel() {
    const collectionId = this.facility?.collectionId;
    const facilityType = this.facility?.facilityType;
    const facilityId = this.facility?.facilityId;
    this.navigateToFacility(collectionId, facilityType, facilityId);
  }

  navigateToFacility(collectionId, facilityType, facilityId) {
    this.router.navigate([`/inventory/facility/${collectionId}/${facilityType}/${facilityId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges(); // prevent weird duplicate stacking on details page
    });
  }
}
