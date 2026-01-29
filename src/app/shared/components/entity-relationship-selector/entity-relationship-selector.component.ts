import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  WritableSignal,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CommonModule } from '@angular/common';
import { RelationshipService } from '../../../services/relationship.service';

/*
 * Configuration for the entity relationship selector
 */

export interface EntityRelationshipConfig {
  // The schema/type of the source entity (e.g., 'activity', 'facility')
  sourceSchema: string;

  // The schema/type of entities to link to (e.g., 'facility', 'geozone')
  targetSchema: string;

  // Display label for the selector
  label: string;

  // Placeholder text for the search input
  placeholder: string;

  // Template for displaying search results in the dropdown
  selectionListTemplate?: TemplateRef<any>;

  // Template for displaying selected items
  selectedItemTemplate?: TemplateRef<any>;

  // Allow multiple selections
  multiselect?: boolean;

  // Prevent changes to selection
  immutableSelection?: boolean;

  // Fields to search on (e.g., ['collectionId', 'activityType'])
  searchFields?: Record<string, any>;

  // Custom filter function for search results
  filterFn?: (item: any, searchFields: any) => boolean;

  // Service method to fetch target entities
  fetchFn?: (searchFields: any) => Promise<any>;

  // Whether to automatically load existing relationships on init (default: true)
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
export class EntityRelationshipSelectorComponent implements OnInit, OnChanges {
  // Configuration for the selector 
  @Input() config!: EntityRelationshipConfig;

  // The source entity that relationships are being created from 
  @Input() sourceEntity: any;

  // Currently selected/linked entities 
  @Input() selectedEntities: any[] = [];

  // Emits when relationships change 
  @Output() relationshipsChanged = new EventEmitter<any[]>();

  // Emits when a relationship is added 
  @Output() relationshipAdded = new EventEmitter<any>();

  // Emits when a relationship is removed 
  @Output() relationshipRemoved = new EventEmitter<any>();

  // Emits when existing relationships are initially loaded (for tracking initial state) 
  @Output() relationshipsLoaded = new EventEmitter<any[]>();

  // Component state
  public searchControl = new UntypedFormControl('');
  public availableEntities: WritableSignal<any[]> = signal([]);
  public loading: boolean = false;

  constructor(
    private relationshipService: RelationshipService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Validate config
    if (!this.config) {
      throw new Error('EntityRelationshipSelectorComponent requires a config input');
    }

    if (!this.config.sourceSchema || !this.config.targetSchema) {
      throw new Error('Config must specify sourceSchema and targetSchema');
    }

    // Load existing relationships if editing an existing entity
    const shouldLoadExisting = this.config.loadExisting !== false; // default true
    if (shouldLoadExisting && this.sourceEntity?.pk && this.sourceEntity?.sk) {
      this.loadExistingRelationships();
    }

    // Initial load of available entities
    if (this.config.searchFields) {
      this.loadAvailableEntities();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload entities when config changes (especially searchFields)
    if (changes['config'] && !changes['config'].firstChange) {
      console.log('Config changed, reloading entities');
      if (this.config?.searchFields) {
        this.loadAvailableEntities();
      }
    }

    // Load existing relationships when sourceEntity changes
    if (changes['sourceEntity'] && !changes['sourceEntity'].firstChange) {
      const shouldLoadExisting = this.config?.loadExisting !== false;
      if (shouldLoadExisting && this.sourceEntity?.pk && this.sourceEntity?.sk) {
        this.loadExistingRelationships();
      }
    }

    // Update internal state when selectedEntities input changes
    if (changes['selectedEntities']) {
      // Trigger change detection to update the view
      this.cdr.detectChanges();
    }
  }

  // Uses the relationship service to fetch related entities with expand=true
  async loadExistingRelationships() {
    if (!this.sourceEntity?.pk || !this.sourceEntity?.sk) {
      console.warn('Cannot load relationships: source entity missing pk or sk');
      return;
    }

    this.loading = true;

    try {
      // Fetch relationships with entity data expanded
      const relationshipsResponse = await this.relationshipService.getRelationshipsFrom(
        this.sourceEntity.pk,
        this.sourceEntity.sk,
        this.config.targetSchema, // target schema filter
        true, // expand entities
        true  // bidirectional
      );

      if (relationshipsResponse?.length > 0) {
        // Extract entity data from expanded relationships
        // Also mark whether each was retrieved via reverse lookup
        const sourcePk = this.sourceEntity.pk;
        const sourceSk = this.sourceEntity.sk;
        const expectedRelPk = `rel::${sourcePk}::${sourceSk}`;

        const existingEntities = relationshipsResponse
          .map((rel: any) => {
            // Check if this is a reverse relationship
            // If rel.pk matches our source, it's forward; otherwise it's a reverse lookup
            const isReverse = rel.pk !== expectedRelPk;

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
          .filter((entity: any) => entity.schema === this.config.targetSchema);

        this.selectedEntities = existingEntities;
        this.relationshipsChanged.emit(this.selectedEntities);
        this.relationshipsLoaded.emit(this.selectedEntities);

        console.log(`Loaded ${existingEntities.length} existing ${this.config.targetSchema} relationships`);
      } else {
        this.selectedEntities = [];
        this.relationshipsLoaded.emit([]);
      }
    } catch (error) {
      console.error('Error loading existing relationships:', error);
      this.selectedEntities = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Can be called manually to refresh the entity list
  async loadAvailableEntities() {
    if (!this.config.fetchFn) {
      console.warn('No fetchFn provided in config, cannot load entities');
      return;
    }

    this.loading = true;

    try {
      const response = await this.config.fetchFn(this.config.searchFields);

      if (response?.items?.length) {
        let entities = response.items;

        // Apply custom filter if provided
        if (this.config.filterFn) {
          entities = entities.filter(item =>
            this.config.filterFn!(item, this.config.searchFields)
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

  // Handle entity selection from typeahead

  selectEntity(match: any) {
    // Prevent selection if not editable (immutable and already has selections)
    if (!this.isSelectionEditable()) {
      return;
    }

    const entity = match.value;

    // Check if already selected
    const isAlreadySelected = this.selectedEntities.some(
      selected => this.isSameEntity(selected, entity)
    );

    // Don't add duplicates
    if (isAlreadySelected) {
      return;
    }

    // Add to selected entities
    let updatedSelection: any[];

    // If multiselect is true we append, otherwise we replace
    if (this.config.multiselect) {
      updatedSelection = [...this.selectedEntities, entity];
    } else {
      updatedSelection = [entity];
    }

    // Don't mutate the input - just emit the change
    this.relationshipsChanged.emit(updatedSelection);
    this.relationshipAdded.emit(entity);

    // Clear search value to allow new selections
    // Use setValue instead of reset to avoid touching form state
    setTimeout(() => {
      this.searchControl.setValue('', { emitEvent: false });
      this.cdr.detectChanges();
    }, 0);
  }

  // Remove an entity from selection
  removeEntity(entity: any) {
    const updatedSelection = this.selectedEntities.filter(
      selected => !this.isSameEntity(selected, entity)
    );

    // Don't mutate the input - just emit the change
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

    // If no search term, return all available entities
    if (!searchTerm) {
      return this.availableEntities();
    }

    return this.availableEntities().filter(entity =>
      entity.display.toLowerCase().includes(searchTerm)
    );
  }

  // Check if selection is editable
  // Returns false when immutableSelection is true AND sourceEntity exists (edit mode)
  isSelectionEditable(): boolean {
    if (!this.config.immutableSelection) {
      return true; // Always editable if not configured as immutable
    }

    // If immutable, check if we're in creation or edit mode
    // Creation mode: sourceEntity is null/undefined or doesn't have pk/sk (not saved yet)
    // Edit mode: sourceEntity has pk/sk (loaded from database)
    const isEditMode = this.sourceEntity?.pk && this.sourceEntity?.sk;
    
    // Only lock in edit mode; always allow changes during creation
    return !isEditMode;
  }
}
