import { Component, Input } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';

/**
 * Reusable dropdown item component for entity selection in typeahead inputs
 * Displays entity with badges, image thumbnail, and selected state
 * 
 * Used by EntityRelationshipSelectorComponent's custom selection templates
 */
@Component({
  selector: 'app-entity-selection-dropdown-item',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './entity-selection-dropdown-item.component.html',
  styleUrls: ['./entity-selection-dropdown-item.component.scss']
})
export class EntitySelectionDropdownItemComponent {
  // The entity object to display (facility, geozone, activity, product, etc.)
  @Input() entity: any;
  // Type of entity - determines badge text and property names
  @Input() entityType: 'facility' | 'geozone' | 'activity' | 'product' = 'facility';
  @Input() isSelected: boolean = false;


  // Get the specific type badge text (e.g., "Day Use", "Frontcountry")
  // Looks for {entityType}Type property on the entity
  get specificType(): string | null {
    const typeKey = `${this.entityType}Type`;
    return this.entity?.[typeKey] || null;
  }

  // Get the entity identifier (e.g., facilityId, geozoneId)
  // Falls back to generic 'identifier' property or 'N/A'
  get identifier(): string {
    const idKey = `${this.entityType}Id`;
    return this.entity?.[idKey] || this.entity?.identifier || 'N/A';
  }

  // Get the display name for the entity
  get displayName(): string {
    return this.entity?.displayName || 'Unnamed';
  }

  // Get the collection ID for the entity
  get collectionId(): string {
    return this.entity?.collectionId || '';
  }

  // Get the version number if available
  get version(): number | null {
    return this.entity?.version || null;
  }

  // Get the image URL if available
  get imageUrl(): string | null {
    return this.entity?.imageUrl || null;
  }
}
