import { AfterViewChecked, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { CollectionFormComponent } from '../collection-form/collection-form.component';
import { CollectionService } from '../../../services/collection.service';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityEditBaseComponent } from '../../../shared/components/entity/entity-base/entity-edit-base.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-collection-edit',
  imports: [CollectionFormComponent, NgIf],
  templateUrl: './collection-edit.component.html',
  styleUrl: './collection-edit.component.scss'
})
export class CollectionEditComponent extends EntityEditBaseComponent implements AfterViewChecked {
  @ViewChild(CollectionFormComponent) collectionFormComponent!: CollectionFormComponent;

  public collectionForm;
  public collection;
  public isSubmitting = false;

  constructor(
    protected collectionService: CollectionService,
    relationshipService: RelationshipService,
    router: Router,
    route: ActivatedRoute,
    cdr: ChangeDetectorRef
  ) {
    super(relationshipService, router, route, cdr);
    if (this.route.parent?.snapshot.data['collection']) {
      this.collection = this.route.parent?.snapshot.data['collection'];
    }
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
  }

  updateCollectionForm(event) {
    this.collectionForm = event;
  }

  get isEditing(): boolean {
    return this.router.url.endsWith('/edit');
  }

  async submit() {
    this.collectionForm.markAllAsTouched();

    if (this.collectionForm.invalid) {
      return;
    }

    const collectionId = this.collection?.collectionId;

    this.isSubmitting = true;
    try {
      const props = this.formatFormForSubmission();

      const res = await this.collectionService.updateCollection(collectionId, props);

      if (res) {
        this.navigateToCollection(collectionId);
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  formatFormForSubmission() {
    // Get all dirty controls by recursion
    const props = Object.entries(this.collectionForm.controls).map(([key, control]) => {
      if (control['dirty']) {
        return {
          [key]: control['value']
        }
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});

    if (props?.['location']) {
      const location = this.collectionForm?.get('location').value;
      props['location'] = {
        type: 'point',
        coordinates: [location.longitude, location.latitude]
      };
    };

    // Handle search terms
    props['searchTerms'] = this.collectionForm.get('searchTerms')?.value || [];

    // Delete relationship form values (managed by RelationshipService post-submit)
    delete props['collectionId']; // Remove collectionId from the props
    return props;
  }

  resetForm() {
    this.collectionFormComponent.resetToCollection(this.collection);
  }

  cancel() {
    const collectionId = this.collection?.collectionId;
    this.navigateToCollection(collectionId);
  }

  navigateToCollection(collectionId) {
    this.router.navigate([`/inventory/collection/${collectionId}`]).then(() => {
      window.scrollTo(0, 0);
      this.cdr.detectChanges(); // prevent weird duplicate stacking on details page
    });
  }
}
