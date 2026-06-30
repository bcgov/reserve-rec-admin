import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionService } from '../../../services/collection.service';
import { CollectionFormComponent } from '../../collection/collection-form/collection-form.component';
import { UntypedFormGroup } from '@angular/forms';
import { ToastService, ToastTypes } from '../../../services/toast.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-collection-create',
  imports: [CollectionFormComponent, NgIf],
  templateUrl: './collection-create.component.html',
  styleUrl: './collection-create.component.scss'
})
export class CollectionCreateComponent {
  public collectionForm: UntypedFormGroup;
  public collection;
  public isSubmitting = false;

  constructor(
    protected collectionService: CollectionService,
    protected router: Router,
    protected toastService: ToastService,
  ) { }

  updateCollectionForm(event) {
    this.collectionForm = event;
  }

  async submit() {
    this.isSubmitting = true;
    try {
      const props = this.formatFormForSubmission();
      const res = await this.collectionService.createCollection(props);
      const collectionId = res?.collectionId;
      if (collectionId) {
        this.navigateToCollection(collectionId);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
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
        };
      }
      return false;
    }).filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {});

    // Always include timezone (the defaulted control may be pristine)
    props['timezone'] = this.collectionForm.get('timezone')?.value;

    return props;
  }

  navigateToCollection(collectionId) {
    this.router.navigate([`/inventory/collection/${collectionId}`]).then(() => {
      window.scrollTo(0, 0);
    });
  }
}
