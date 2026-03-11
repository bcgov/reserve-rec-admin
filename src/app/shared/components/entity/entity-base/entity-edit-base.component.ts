import { ChangeDetectorRef, Directive } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RelationshipService } from '../../../../services/relationship.service';

@Directive()
export abstract class EntityEditBaseComponent {
  protected initialRelationships = new Map<string, any[]>();
  protected currentRelationships = new Map<string, any[]>();

  constructor(
    protected relationshipService: RelationshipService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cdr: ChangeDetectorRef
  ) {}

  // Called by child form when relationships are first loaded (e.g. on edit)
  onRelationshipsLoaded(type: string, relationships: any[]): void {
    const copy = [...relationships];
    this.initialRelationships.set(type, copy);
    this.currentRelationships.set(type, [...copy]);
  }

  // Called by child form whenever the user adds or removes a relationship
  onRelationshipsChanged(type: string, relationships: any[]): void {
    this.currentRelationships.set(type, [...relationships]);
  }

  // Syncs all tracked relationship types against the API
  protected async synchronizeAll(sourceEntity){
    for (const [type, initialItems] of this.initialRelationships) {
      const currentItems = this.currentRelationships.get(type) ?? [];
      await this.relationshipService.syncRelationships(
        sourceEntity,
        initialItems,
        currentItems
      );
    }
  }
}
