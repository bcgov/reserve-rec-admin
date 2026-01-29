import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { LoadalComponent } from '../../../shared/components/loadal/loadal.component';
import { EntityRelationshipSelectorComponent } from '../../../shared/components/entity-relationship-selector/entity-relationship-selector.component';
import { RelationshipService } from '../../../services/relationship.service';
import { ActivityService } from '../../../services/activity.service';
import { FacilityService } from '../../../services/facility.service';
import { GeozoneService } from '../../../services/geozone.service';
import { Constants } from '../../../app.constants';

@Component({
  selector: 'app-relationship-create',
  standalone: true,
  imports: [CommonModule, NgdsFormsModule, LoadalComponent, EntityRelationshipSelectorComponent],
  templateUrl: './relationship-create.component.html',
  styleUrls: ['./relationship-create.component.scss']
})
export class RelationshipCreateComponent implements OnInit {
  @ViewChild('loadal') loadal!: LoadalComponent;

  public form: UntypedFormGroup;

  // Pull entity types from constants
  public entityTypes = Constants.entityTypes;

  public sourceEntities = [];
  public sourceEntityListItems = [];
  public targetEntityTypes = [];
  public selectedSourceEntity: any = null;
  public relationshipConfigs = new Map();
  public selectedRelationships = new Map();
  public initialRelationships = new Map();

  public loading = false;

  constructor(
    private relationshipService: RelationshipService,
    private activityService: ActivityService,
    private facilityService: FacilityService,
    private geozoneService: GeozoneService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.form = new UntypedFormGroup({
      collectionId: new UntypedFormControl('', {
        validators: [Validators.required],
        updateOn: 'blur'
      }),
      sourceEntityType: new UntypedFormControl('', {
        validators: [Validators.required],
        updateOn: 'blur'
      }),
      sourceEntity: new UntypedFormControl('', {
        validators: [Validators.required],
        updateOn: 'blur'
      })
    });
  }

  ngOnInit() {
    // Watch for entity type changes to update allowed targets
    this.form.get('sourceEntityType')?.valueChanges.subscribe(entityType => {
      this.onSourceEntityTypeChange(entityType);
    });

    // Watch for collection ID changes to reload source entities
    this.form.get('collectionId')?.valueChanges.subscribe(collectionId => {
      this.onCollectionIdChange();
    });

    // Only process when an entity is actually selected
    this.form.get('sourceEntity')?.valueChanges.subscribe(entity => {
      if (entity) {
        this.onSourceEntitySelected(entity);
        this.loadExistingRelationships();
      }
    });

    // Read query params to pre-populate form (e.g., when navigating from entity detail page)
    this.route.queryParams.subscribe(params => {
      if (params['collectionId']) {
        this.form.get('collectionId')?.setValue(params['collectionId'], { emitEvent: true });
      }
      if (params['sourceEntityType']) {
        this.form.get('sourceEntityType')?.setValue(params['sourceEntityType'], { emitEvent: true });
      }
      // Wait for entities to load before setting sourceEntity
      if (params['sourceEntity']) {
        // Use setTimeout to ensure entities are loaded first
        setTimeout(() => {
          this.form.get('sourceEntity')?.setValue(params['sourceEntity'], { emitEvent: true });
        }, 500);
      }
    });
  }

  onSourceEntityTypeChange(entityType: string) {
    // Find the config for this entity type
    const config = this.entityTypes.find(entity => entity.value === entityType);
    if (!config) {
      this.targetEntityTypes = [];
      return;
    }

    // Set allowed target types, e.g. geozones can link to facilities and activities, etc.
    this.targetEntityTypes = this.entityTypes.filter(entity => 
      config.allowedTargets.includes(entity.value)
    );

    // Reset sourceEntity selection and related data on change
    this.form.get('sourceEntity')?.reset('');
    this.sourceEntities = [];
    this.sourceEntityListItems = [];
    this.selectedSourceEntity = null;
    this.relationshipConfigs.clear();
    this.selectedRelationships.clear();

    // Load source entities if collection ID is set
    if (this.form.get('collectionId')?.value) {
      this.loadSourceEntities();
    }

    // Update
    this.cdr.detectChanges();
  }

  onCollectionIdChange() {
    // Reset everything when collection changes
    this.form.get('sourceEntity')?.reset('');
    this.sourceEntityListItems = [];
    this.sourceEntities = [];
    this.selectedSourceEntity = null;
    this.relationshipConfigs.clear();
    this.selectedRelationships.clear();

    // Reload if entity type is selected
    if (this.form.get('sourceEntityType')?.value) {
      this.loadSourceEntities();
    }
  }

  // Load source entities based on selected collection ID and entity type
  async loadSourceEntities() {
    const collectionId = this.form.get('collectionId')?.value;
    const entityType = this.form.get('sourceEntityType')?.value;


    if (!collectionId || !entityType) return;

    this.loading = true;

    // Retrieve entities based on type that matches the collection ID and entity type
    try {
      let response;
      switch (entityType) {
        case 'geozone':
          response = await this.geozoneService.getGeozonesByCollectionId(collectionId);
          break;
        case 'facility':
          response = await this.facilityService.getFacilitiesByCollectionId(collectionId);
          break;
        case 'activity':
          response = await this.activityService.getActivitiesByCollectionId(collectionId);
          break;
      }

      this.sourceEntities = response?.items || [];
      // Update the list items for the picklist
      this.sourceEntityListItems = this.sourceEntities.map(e => ({
        value: `${e.pk}::${e.sk}`,
        display: e.displayName || e.name || `${e.pk} - ${e.sk}`
      }));

    } catch (error) {
      console.error('Error loading source entities:', error);
      this.sourceEntities = [];
      this.sourceEntityListItems = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onSourceEntitySelected(entityId: string) {
    if (!entityId) {
      this.selectedSourceEntity = null;
      this.relationshipConfigs.clear();
      this.selectedRelationships.clear();
      return;
    }

    // Find the actual entity from the ID string (format: "pk::sk")
    this.selectedSourceEntity = this.sourceEntities.find(e => `${e.pk}::${e.sk}` === entityId);

    if (this.selectedSourceEntity) {
      this.initializeRelationshipConfigs();
    }
  }

  initializeRelationshipConfigs() {
    const sourceType = this.form.get('sourceEntityType')?.value;
    const collectionId = this.form.get('collectionId')?.value;

    this.relationshipConfigs.clear();
    this.selectedRelationships.clear();

    // Create a config for each allowed target type
    this.targetEntityTypes.forEach(targetType => {
      const config = {
        sourceSchema: sourceType,
        targetSchema: targetType.value,
        label: `Link ${targetType.display} Entities`,
        placeholder: `Searching for ${targetType.display}...`,
        multiselect: targetType.multiselect,
        immutableSelection: false,
        loadExisting: false,
        searchFields: { collectionId },
        fetchFn: async () => {
          return await this.fetchTargetEntities(targetType.value, collectionId);
        },
        filterFn: (item: any) => item.collectionId === collectionId
      };
      
      this.relationshipConfigs.set(targetType.value, config);
      this.selectedRelationships.set(targetType.value, []);
    });

    this.cdr.detectChanges();
  }

  // Load existing relationships for the selected source entity
  async loadExistingRelationships() {
    if (!this.selectedSourceEntity?.pk || !this.selectedSourceEntity?.sk) {
      console.warn('Cannot load relationships: Source entity missing pk or sk');
      return;
    }

    const sourceType = this.form.get('sourceEntityType')?.value;
    const sourcePk = this.selectedSourceEntity.pk;
    const sourceSk = this.selectedSourceEntity.sk;

    // Load relationships for each configured target type
    for (const targetType of this.selectedRelationships.keys()) {
      try {
        const relationships = await this.relationshipService.getRelationshipsFrom(
          sourcePk,
          sourceSk,
          targetType,  // targetSchema filter
          true, // expand entities
          true  // bidirectional
        );

        if (relationships?.length > 0) {
          // Map relationships to entities with metadata for tracking
          const entitiesWithMeta = relationships
            .map((rel: any) => {
            // Check if this is a reverse relationship
            // If rel.pk matches our source, it's forward; otherwise it's a reverse lookup
            const isReverse = rel.pk !== sourcePk;

            // This is useful in deleting relationships using the correct direction
            return {
              ...rel.entity,
              _relationshipMeta: {
                isReverse: isReverse,
                relationshipPk: rel.pk,
                relationshipSk: rel.sk
              }
            };
          })
          .filter((entity: any) => entity !== null && entity.pk !== undefined)
          // Filter by target schema to ensure we only show the correct entity type
          .filter((entity: any) => entity.schema === targetType);

          // Store initial state for comparison on submit
          this.initialRelationships.set(targetType, entitiesWithMeta);

          // Populate the selected relationships with the same entities
          this.selectedRelationships.set(targetType, entitiesWithMeta);

        }

      } catch (error) {
        console.error(`Error loading ${targetType} relationships:`, error);
      }
    }
    this.cdr.detectChanges();
  }

  async fetchTargetEntities(targetType, collectionId) {
    switch (targetType) {
      case 'geozone':
        return await this.geozoneService.getGeozonesByCollectionId(collectionId);
      case 'facility':
        return await this.facilityService.getFacilitiesByCollectionId(collectionId);
      case 'activity':
        return await this.activityService.getActivitiesByCollectionId(collectionId);
      default:
        return { items: [] };
    }
  }

  onRelationshipsChanged(targetType: string, relationships) {
    this.selectedRelationships.set(targetType, [...relationships]);
  }

  onRelationshipsRemoved(targetType: string, relationship) {
    const currentRelationships = this.selectedRelationships.get(targetType) || [];
    const updatedRelationships = currentRelationships.filter(rel => 
      !(rel.pk === relationship.pk && rel.sk === relationship.sk)
    );
    this.selectedRelationships.set(targetType, updatedRelationships);
  }

  async submit() {
    const sourceType = this.form.get('sourceEntityType')?.value;
    const sourcePk = this.selectedSourceEntity.pk;
    const sourceSk = this.selectedSourceEntity.sk;
    
    const errors: string[] = [];
    
    this.loading = true;


    // See if there are differences between initial and current selections
    for (const [targetType, initialRels] of this.initialRelationships.entries()) {
      const currentRels = this.selectedRelationships.get(targetType) || [];

      // Find removed relationships (compare entity pk/sk directly)
      const removedRels = initialRels.filter(initRel => 
        !currentRels.some(currRel => currRel.pk === initRel.pk && currRel.sk === initRel.sk)
      );

      // Delete removed relationships
      for (const rel of removedRels) {
        try {
          await this.relationshipService.deleteRelationship(
            sourcePk,
            sourceSk,
            rel.pk,
            rel.sk,
          );
        } catch (error) {
          console.error(`Error deleting relationship to ${targetType}:`, error);
          errors.push(`Failed to unlink ${targetType}: ${rel.displayName || rel.name}`);
        }
      }
    }

    // Check for new relationships to create
    for (const [targetType, currentRels] of this.selectedRelationships.entries()) {
      const initialRels = this.initialRelationships.get(targetType) || [];

      // Find new relationships (compare entity pk/sk directly)
      const newRels = currentRels.filter(currRel => 
        !initialRels.some(initRel => initRel.pk === currRel.pk && initRel.sk === currRel.sk)
      );

      // Create new relationships
      for (const rel of newRels) {
        try {
          await this.relationshipService.createRelationship(
            sourcePk,
            sourceSk,
            rel.pk,
            rel.sk
          );
        } catch (error) {
          console.error(`Error creating relationship to ${targetType}:`, error);
          errors.push(`Failed to link ${targetType}: ${rel.displayName || rel.name}`);
        }
      }
    }
    
    this.loading = false;
    
    // Show results
    const redirectUrls = {
      'activity': `/inventory/activity/${this.selectedSourceEntity.collectionId}/${this.selectedSourceEntity.activityType}/${this.selectedSourceEntity.activityId}`,
      'facility': `/inventory/facility/${this.selectedSourceEntity.collectionId}/${this.selectedSourceEntity.facilityType}/${this.selectedSourceEntity.facilityId}`,
      'geozone': `/inventory/geozone/${this.selectedSourceEntity.collectionId}/${this.selectedSourceEntity.geozoneId}`,
      'product': `/inventory/product/${this.selectedSourceEntity.collectionId}/${this.selectedSourceEntity.activityType}/${this.selectedSourceEntity.activityId}/${this.selectedSourceEntity.productId}`
    }
    this.router.navigate([redirectUrls[sourceType]]).then(() => {
      window.scrollTo(0, 0);
    });
    this.cdr.detectChanges();

    if (errors.length > 0) {
      alert(`Some relationships failed:\n${errors.join('\n')}`);
    }
  }

  getSourceEntityListItems() {
    return this.sourceEntities.map(e => ({
      value: `${e.pk}::${e.sk}`, // Use a string identifier instead of the object
      display: e.displayName || e.name || `${e.pk} - ${e.sk}`
    }));
  }

  getEntityIcon(entityType: string): string {
    return this.entityTypes.find(et => et.value === entityType)?.icon || 'fa-circle';
  }
}
