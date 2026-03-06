import { Injectable } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { TemplateRef } from '@angular/core';
import { EntityRelationshipConfig, EntityRelationshipSelectorComponent } from '../shared/components/entity-relationship-selector/entity-relationship-selector.component';
import { ActivityService } from './activity.service';

@Injectable({ providedIn: 'root' })
export class ActivityRelationshipService {
  constructor(private activityService: ActivityService) {}

  buildConfig(
    form: UntypedFormGroup,
    itemTemplate: TemplateRef<any>,
    selectionTemplate: TemplateRef<any>,
    getSelector: () => EntityRelationshipSelectorComponent
  ): EntityRelationshipConfig {
    const config: EntityRelationshipConfig = {
      sourceSchema: 'product',
      targetSchema: 'activity',
      label: 'Select the activity for this product',
      placeholder: 'Start typing to search activities...',
      multiselect: false,
      immutableSelection: true,
      selectedItemTemplate: itemTemplate,
      selectionListTemplate: selectionTemplate,
      searchFields: { collectionId: form.get('collectionId')?.value },
      fetchFn: async (searchFields) => {
        if (form.get('collectionId')?.value) {
          return this.activityService.getActivitiesByCollectionId(searchFields.collectionId);
        }
      },
      filterFn: (activity, searchFields) =>
        activity.collectionId === searchFields.collectionId
    };

    form.get('collectionId')?.valueChanges.subscribe(collectionId => {
      config.searchFields = { collectionId };
      getSelector()?.loadAvailableEntities();
    });

    return config;
  }

  async loadActivityForProduct(collectionId: string, activityType: string, activityId: string) {
    if (!collectionId || !activityType || !activityId) return null;
    const result = await this.activityService.getActivity(collectionId, activityType, activityId);
    return Array.isArray(result) ? result[0] : result;
  }
}
