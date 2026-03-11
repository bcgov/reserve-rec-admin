import { ChangeDetectorRef, Directive, EventEmitter, Output } from '@angular/core';
import {
  EntityRelationshipConfig,
  EntityRelationshipSelectorComponent,
} from '../entity-relationship-selector/entity-relationship-selector.component';

@Directive()
export abstract class EntityFormBaseComponent {
  @Output() relationshipsLoaded = new EventEmitter<{ type: string; relationships: any[] }>();
  @Output() relationshipsChanged = new EventEmitter<{ type: string; relationships: any[] }>();

  protected selectedEntities = new Map<string, any[]>();
  protected relationshipConfigs = new Map<string, EntityRelationshipConfig>();
  protected relationshipSelectors = new Map<string, EntityRelationshipSelectorComponent>();

  constructor(protected cdr: ChangeDetectorRef) {}

  // Store a config for a given relationship type.
  protected setRelationshipConfig(type: string, config: EntityRelationshipConfig): void {
    this.relationshipConfigs.set(type, config);
  }

  // Retrieve the config for a given type (use in templates).
  getRelationshipConfig(type: string): EntityRelationshipConfig | undefined {
    return this.relationshipConfigs.get(type);
  }

  // Register a selector component ref so search fields can be updated later.
  registerSelector(type: string, selector: EntityRelationshipSelectorComponent): void {
    if (selector) {
      this.relationshipSelectors.set(type, selector);
    }
  }

  // Called when relationship selector reports initial loaded entities (edit mode).
  onRelationshipsLoaded(type: string, relationships: any[]): void {
    this.selectedEntities.set(type, [...relationships]);
    this.relationshipsLoaded.emit({ type, relationships });
  }

  // Called when the user adds or removes a relationship. Override to add form field updates.
  onRelationshipsChanged(type: string, relationships: any[]): void {
    this.selectedEntities.set(type, [...relationships]);
    this.relationshipsChanged.emit({ type, relationships });
    this.cdr.detectChanges();
  }

  // Returns the currently selected entities for a given type.
  getSelectedForType(type: string): any[] {
    return this.selectedEntities.get(type) ?? [];
  }

  // Returns true if the given entity is currently selected for the given type.
  isEntitySelected(type: string, entity: any): boolean {
    return this.getSelectedForType(type).some(
      e => e.pk === entity.pk && e.sk === entity.sk
    );
  }

  // Restores selectedEntities from a snapshot (e.g. initialRelationships on reset).
  resetSelectedEntities(initialRelationships: Map<string, any[]>): void {
    for (const [type, items] of initialRelationships) {
      this.selectedEntities.set(type, [...items]);
    }
    this.cdr.detectChanges();
  }
}
