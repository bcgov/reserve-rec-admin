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
  @Input() entity: any;
  @Input() isSelected: boolean = false;

  private readonly schemaConfig = {
    geozone: {
      icon: 'fas fa-location-dot',
      identifierKey: 'geozoneId',
      typeKey: 'geozoneType',
      collectionKey: 'collectionId',
    },
    facility: {
      icon: 'fas fa-building',
      identifierKey: 'facilityId',
      typeKey: 'facilityType',
      collectionKey: 'collectionId',
    },
    activity: {
      icon: 'fas fa-running',
      identifierKey: 'activityId',
      typeKey: 'activityType',
      collectionKey: 'collectionId',
    },
    product: {
      icon: 'fas fa-box-open',
      identifierKey: 'productId',
      typeKey: 'productType',
      collectionKey: 'collectionId',
    },
    policy: {
      icon: 'fas fa-receipt',
      identifierKey: 'policyId',
      typeKey: 'policyType',
      versionKey: 'policyIdVersion'
    },
  };

  // Each entity comes in with a schem, so we use a schemaConfig to help map the badges
  // e.g. for a geozone entity, we know to look for geozoneId, geozoneType, and collectionId based on the config 
  private get config() {
    return this.schemaConfig[this.entity?.schema] ?? { icon: 'fas fa-question' };
  }

  get icon(): string {
    return this.config.icon;
  }

  get specificType(): string | null {
    return this.config.typeKey ? (this.entity?.[this.config.typeKey] ?? null) : null;
  }

  get identifier(): string | null {
    return this.config.identifierKey ? (this.entity?.[this.config.identifierKey] ?? null) : null;
  }

  get displayName(): string {
    return this.entity?.displayName || 'N/A';
  }

  get subsetCollection(): string | null {
    if (this.config.collectionKey) {
      return this.entity?.[this.config.collectionKey] ?? null;
    } 

    return null;
  }

  get version(): number | null {
    const key = this.config.versionKey ?? 'version';
    return this.entity?.[key] ?? 'asdf';
  }

  get imageUrl(): string | null {
    return this.entity?.imageUrl ?? null;
  }

  camelToTitle(value: string): string {
    return value?.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()) ?? '';
  }
}
