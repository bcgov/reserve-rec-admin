import {
  Component,
  Output,
  EventEmitter,
  TemplateRef,
  WritableSignal,
  signal,
  ChangeDetectorRef,
  input,
  effect,
  untracked
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { RelationshipService } from '../../../../services/relationship.service';

/*
 * Configuration for the entity relationship selector
 */

export interface EntityRelationshipConfig {
  sourceSchema: string;
  targetSchema: string;
  label: string;
  placeholder: string;
  selectionListTemplate?: TemplateRef<any>;
  selectedItemTemplate?: TemplateRef<any>;
  multiselect?: boolean;
  immutableSelection?: boolean;
  searchFields?: Record<string, any>;
  filterFn?: (item: any, searchFields: any) => boolean;
  fetchFn?: (searchFields: any) => Promise<any>;
  loadExisting?: boolean;
}

/*
 * Generic reusable component for managing entity relationships
 */
@Component({
  selector: 'app-entity-relationship-selector',
  standalone: true,
  imports: [NgdsFormsModule, CommonModule],
  templateUrl: './entity-relationship-selector.component.html',
  styleUrls: ['./entity-relationship-selector.component.scss']
})

export class EntityRelationshipSelectorComponent {
  config = input.required<EntityRelationshipConfig>();
  sourceEntity = input<any>();
  selectedEntities = input<any[]>([]);
  
  @Output() relationshipsChanged = new EventEmitter<any[]>();
  @Output() relationshipAdded = new EventEmitter<any>();
  @Output() relationshipRemoved = new EventEmitter<any>();
  @Output() relationshipsLoaded = new EventEmitter<any[]>();

  public searchControl = new UntypedFormControl('');
  public availableEntities: WritableSignal<any[]> = signal([]);
  public loading: boolean = false;
  
  private internalSelectedEntities: WritableSignal<any[]> = signal([]);

  constructor(
    private relationshipService: RelationshipService,
    private cdr: ChangeDetectorRef
  ) {
    // Effect to track config changes
    effect(() => {
      const config = this.config();
      
      if (config) {
        untracked(() => {
          // Load available entities when config changes
          this.loadAvailableEntities();
        });
      }
    });

    // Effect to track source entity changes
    effect(() => {
      const sourceEntity = this.sourceEntity();
      const config = this.config();
      
      if (sourceEntity && config && config.loadExisting !== false) {
        untracked(() => {
          // Load existing relationships when source entity changes
          this.loadExistingRelationships();
        });
      }
    });

    // Effect to sync input selectedEntities with internal state
    effect(() => {
      const selectedEntities = this.selectedEntities();
      
      untracked(() => {
        this.internalSelectedEntities.set(selectedEntities);
        this.cdr.detectChanges();
      });
    });
  }

  // Uses the relationship service to fetch related entities with expand=true
  async loadExistingRelationships() {
    const sourceEntity = this.sourceEntity();
    const config = this.config();
    
    if (!sourceEntity?.pk || !sourceEntity?.sk) {
      console.warn('Cannot load relationships: source entity missing pk or sk');
      return;
    }

    this.loading = true;

    try {
      // Fetch relationships with entity data expanded
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        sourceEntity.pk,
        sourceEntity.sk,
        config.targetSchema, // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        // Extract entity data from expanded relationships
        const sourcePk = sourceEntity.pk;
        const sourceSk = sourceEntity.sk;
        const expectedRelPk = `rel::${sourcePk}::${sourceSk}`;

        const existingEntities = relationshipsResponse
          .map((rel: any) => {
            const isReverse = rel.pk !== expectedRelPk;
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
          .filter((entity: any) => entity.schema === config.targetSchema);

        this.internalSelectedEntities.set(existingEntities);
        this.relationshipsChanged.emit(existingEntities);
        this.relationshipsLoaded.emit(existingEntities);

        console.log(`Loaded ${existingEntities.length} existing ${config.targetSchema} relationships`);
      } else {
        this.internalSelectedEntities.set([]);
        this.relationshipsLoaded.emit([]);
      }
    } catch (error) {
      console.error('Error loading existing relationships:', error);
      this.internalSelectedEntities.set([]);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Can be called manually to refresh the entity list
  async loadAvailableEntities() {
    const config = this.config();
    
    if (!config.fetchFn) {
      console.warn('No fetchFn provided in config, cannot load entities');
      return;
    }

    this.loading = true;

    try {
      const response = await config.fetchFn(config.searchFields);

      if (response?.items?.length) {
        let entities = response.items;

        // Apply custom filter if provided
        if (config.filterFn) {
          entities = entities.filter(item =>
            config.filterFn!(item, config.searchFields)
          );
        }

        // Map to selection format
        this.availableEntities.set(entities.map(entity => ({
          value: entity,
          display: entity.displayName || entity.name || entity.identifier
        })));
      } else {
        this.availableEntities.set([]);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
      this.availableEntities.set([]);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Called by the "Link {{config}}" button
  // Commits the currently staged typeahead selection
  linkCurrentSelection() {
    const value = this.searchControl.value;
    if (!value?.pk) return;
    this.selectEntity({ value, display: value.displayName || value.name || '' });
    this.searchControl.setValue(' ');
  }

  // Handle entity selection from typeahead
  selectEntity(match: any) {
    // Prevent selection if not editable (immutable and already has selections)
    if (!this.isSelectionEditable()) {
      return;
    }

    const entity = match.value;
    const currentSelected = this.internalSelectedEntities();

    // Check if already selected
    const isAlreadySelected = currentSelected.some(
      selected => this.isSameEntity(selected, entity)
    );

    if (isAlreadySelected) {
      return;
    }

    // Add to selected entities
    let updatedSelection: any[];

    if (this.config().multiselect) {
      updatedSelection = [...currentSelected, entity];
    } else {
      updatedSelection = [entity];
    }

    this.internalSelectedEntities.set(updatedSelection);
    this.relationshipsChanged.emit(updatedSelection);
    this.relationshipAdded.emit(entity);

    this.searchControl.setValue('');
    this.cdr.detectChanges();
  }

  // Remove an entity from selection
  removeEntity(entity: any) {
    const currentSelected = this.internalSelectedEntities();
    const updatedSelection = currentSelected.filter(
      selected => !this.isSameEntity(selected, entity)
    );

    this.internalSelectedEntities.set(updatedSelection);
    this.relationshipsChanged.emit(updatedSelection);
    this.relationshipRemoved.emit(entity);
    this.cdr.detectChanges();
  }

  // Check if two entities are the same based on pk and sk
  private isSameEntity(entity1: any, entity2: any): boolean {
    return entity1.pk === entity2.pk && entity1.sk === entity2.sk;
  }

  // Get filtered entities based on search
  getFilteredEntities(): any[] {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';

    if (!searchTerm) {
      return this.availableEntities();
    }

    return this.availableEntities().filter(entity =>
      entity.display.toLowerCase().includes(searchTerm)
    );
  }

  // Check if selection is editable
  isSelectionEditable(): boolean {
    const config = this.config();
    const sourceEntity = this.sourceEntity();
    
    if (!config.immutableSelection) {
      return true;
    }

    const isEditMode = sourceEntity?.pk && sourceEntity?.sk;
    return !isEditMode;
  }

  // Update methods to use internal signal
  getSelectedEntities(): any[] {
    return this.internalSelectedEntities();
  }

  // Add trackBy function for the ngFor loops
  trackByEntity(index, entity) {
    return `${entity.value.pk}::${entity.value.sk}`
  }

  trackBySelectedEntity(index, entity) {
    return `${entity.pk}::${entity.sk}`
  }

}
