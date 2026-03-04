import { AfterViewInit, Component, Input, Output, EventEmitter, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityRelationshipSelectorComponent, EntityRelationshipConfig } from '../entity-relationship-selector/entity-relationship-selector.component';
import { EntitySelectionDropdownItemComponent } from '../entity-selection-dropdown-item/entity-selection-dropdown-item.component';
import { PolicyService } from '../../../services/policy.service';

@Component({
  selector: 'app-policy-selector',
  standalone: true,
  imports: [CommonModule, EntityRelationshipSelectorComponent, EntitySelectionDropdownItemComponent],
  templateUrl: './policy-selector.component.html'
})

export class PolicySelectorComponent implements AfterViewInit {
  @Input() policyType!: 'reservation' | 'party' | 'fee' | 'change';
  @Input() selectedPolicy: any = null;

  @Output() policyChanged = new EventEmitter<any>();
  @Output() policyLoaded = new EventEmitter<any>();

  @ViewChild('itemTemplate') itemTemplate: TemplateRef<any>;
  @ViewChild('selectionTemplate') selectionTemplate: TemplateRef<any>;
  @ViewChild('selector') selector: EntityRelationshipSelectorComponent;

  public config: EntityRelationshipConfig | null = null;

  constructor(private policyService: PolicyService) {}

  ngAfterViewInit() {
    this.config = {
      sourceSchema: 'product',
      targetSchema: `${this.policyType}Policy`,
      label: `Select a ${this.label} to apply to this product`,
      placeholder: 'Start typing to search...',
      multiselect: false,
      immutableSelection: true,
      selectedItemTemplate: this.itemTemplate,
      selectionListTemplate: this.selectionTemplate,
      fetchFn: async () => this.policyService.getPoliciesByPolicyType(this.policyType)
    };
  }

  isSelected(entity: any) {
    return this.selectedPolicy?.pk === entity.pk && this.selectedPolicy?.sk === entity.sk; 
  }

  selectEntity(match) {
    this.selector.selectEntity(match);
  }

  onChanged(policies) {
    this.policyChanged.emit(policies);
  }

  onLoaded(policies) {
    this.policyLoaded.emit(policies);
  }

  get entityType(): 'reservation' | 'party' | 'fee' | 'change' {
    return `${this.policyType}Policy` as 'reservation' | 'party' | 'fee' | 'change';
  }

  get label() {
    return `${this.policyType.charAt(0).toUpperCase()}${this.policyType.slice(1)} Policy`;
  }

};
