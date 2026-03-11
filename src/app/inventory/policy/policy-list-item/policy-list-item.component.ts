import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-policy-list-item',
  imports: [CommonModule],
  templateUrl: './policy-list-item.component.html',
  styleUrl: './policy-list-item.component.scss'
})
export class PolicyListItemComponent {
  @Input() policy: any;
  @Input() isEditing: boolean = false;
  @Input() isCreating: boolean = false;
  @Output() policyRemoved = new EventEmitter<any>();

  removePolicy(policy: any) {
    this.policyRemoved.emit(policy);
  }

  navigateToPolicy(policy: any) {
    const policyUrl = `/inventory/policy/${policy.collectionId}/${policy.policyType}/${policy.policyId}`;
    window.open(policyUrl, '_blank');
  }
}
