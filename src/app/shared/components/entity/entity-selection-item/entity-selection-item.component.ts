import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Configuration for entity selection item display
 */
export interface EntitySelectionConfig {
  /** Schema/type of the entity (e.g., 'facility', 'geozone', 'product') */
  schema: string;
  
  /** Primary badge field (e.g., 'facilityType', 'activityType') */
  primaryBadgeField?: string;
  
  /** Fields to display as secondary badges */
  badgeFields?: {
    field: string;
    label?: string;
    class?: string;
  }[];
  showImage?: boolean;
  imageField?: string;
  identifierField?: string;
  versionField?: string;
  cardClass?: string;
}

@Component({
  selector: 'app-entity-selection-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-selection-item.component.html',
  styleUrl: './entity-selection-item.component.scss'
})

export class EntitySelectionItemComponent {
  @Input() entity: any;
  @Input() config: EntitySelectionConfig;
  @Input() selected: boolean = false;

  getIdentifier(): string {
    const idField = this.config?.identifierField || 'identifier';
    return this.entity?.[idField] || 
           this.entity?.facilityId || 
           this.entity?.geozoneId || 
           this.entity?.activityId || 
           this.entity?.productId || 
           'N/A';
  }

  getImageUrl(): string {
    const imageField = this.config?.imageField || 'imageUrl';
    return this.entity?.[imageField] || '';
  }
}
