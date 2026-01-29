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
  
  /** Whether to show image thumbnail */
  showImage?: boolean;
  
  /** Custom image field name (defaults to 'imageUrl') */
  imageField?: string;
  
  /** Custom identifier field (defaults to 'identifier') */
  identifierField?: string;
  
  /** Custom version field (defaults to 'version') */
  versionField?: string;
  
  /** Additional CSS class for the card */
  cardClass?: string;
}

/**
 * Reusable component for entity selection items
 * Provides a consistent look and feel across different entity types
 * 
 * @example
 * <app-entity-selection-item
 *   [entity]="facility"
 *   [config]="facilityConfig"
 *   [selected]="isSelected(facility)"
 * ></app-entity-selection-item>
 */
@Component({
  selector: 'app-entity-selection-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="card-body m-1 border border-2 rounded-3 d-flex justify-content-between entity-select-item"
      [class.selected]="selected"
      [ngClass]="config?.cardClass"
      tabindex="0"
    >
      <div class="p-3 w-100">
        <div class="mb-1">
          {{ entity?.displayName || entity?.name }}
        </div>
        <div class="d-flex flex-wrap gap-1">
          <!-- Schema badge -->
          <div class="badge bg-primary">
            {{ config?.schema | titlecase }}
          </div>
          
          <!-- Collection ID badge -->
          <div class="badge bg-secondary" *ngIf="entity?.collectionId">
            {{ entity.collectionId }}
          </div>
          
          <!-- Primary badge (e.g., facilityType, activityType) -->
          <div class="badge bg-primary" *ngIf="config?.primaryBadgeField && entity[config.primaryBadgeField]">
            {{ entity[config.primaryBadgeField] | titlecase }}
          </div>
          
          <!-- Custom badge fields -->
          <div 
            *ngFor="let badgeField of config?.badgeFields"
            class="badge"
            [ngClass]="badgeField.class || 'bg-secondary'"
          >
            {{ badgeField.label || '' }}{{ entity[badgeField.field] }}
          </div>
          
          <!-- Identifier badge -->
          <div class="badge bg-secondary">
            #{{ getIdentifier() }}
          </div>
          
          <!-- Version badge -->
          <div class="badge bg-light text-muted border border-1" *ngIf="entity[config?.versionField || 'version']">
            v{{ entity[config?.versionField || 'version'] }}
          </div>
        </div>
      </div>
      
      <!-- Image thumbnail -->
      <div class="p-1" *ngIf="config?.showImage !== false">
        <div class="d-flex align-items-center justify-content-center">
          <div class="border border-1 rounded-3" style="width: 100px; height: 80px; overflow: hidden;">
            <img
              *ngIf="getImageUrl()"
              [src]="getImageUrl()"
              [alt]="entity?.displayName || 'Image'"
              width="100%"
              height="80px"
              style="object-fit: cover;"
            />
            <div
              *ngIf="!getImageUrl()"
              class="text-muted d-flex justify-content-center align-items-center h-100"
            >
              <small>No image</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .entity-select-item {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background-color: #f5f5f5;
        border-color: var(--bs-primary) !important;
      }

      &:focus {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
      }

      &.selected {
        background-color: #e7f3ff;
        border-color: var(--bs-primary) !important;
        
        &:hover {
          background-color: #d0e7ff;
        }
      }
    }

    .gap-1 {
      gap: 0.25rem;
    }
  `]
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
