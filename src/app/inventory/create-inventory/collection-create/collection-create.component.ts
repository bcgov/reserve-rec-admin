import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionService } from '../../../services/collection.service';
import { CollectionFormComponent } from '../../collection/collection-form/collection-form.component';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { UntypedFormGroup } from '@angular/forms';
import { ToastService, ToastTypes } from '../../../services/toast.service';

@Component({
  selector: 'app-collection-create',
  imports: [CollectionFormComponent, LoadalComponent],
  templateUrl: './collection-create.component.html',
  styleUrl: './collection-create.component.scss'
})
export class CollectionCreateComponent {
  @ViewChild('loadal', { static: true }) loadal!: LoadalComponent

  public collectionForm: UntypedFormGroup;
  public collection;

  constructor(
    protected collectionService: CollectionService,
    protected router: Router,
    protected toastService: ToastService
  ) { }

  updateCollectionForm(event) {
    this.collectionForm = event;
  }

  async submit() {
    this.loadal.show();
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
      this.loadal.hide();
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
    return props;
  }

  navigateToCollection(collectionId) {
    this.router.navigate([`/inventory/collection/${collectionId}`]).then(() => {
      window.scrollTo(0, 0);
    });
  }
}
