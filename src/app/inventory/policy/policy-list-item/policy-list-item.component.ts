import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-policy-list-item',
  imports: [CommonModule],
  templateUrl: './policy-list-item.component.html',
  styleUrl: './policy-list-item.component.scss'
})
export class PolicyListItemComponent {
  @Input() policy: any;
  @Input() showDetailsButton: boolean = true;

  public constantsData = null;

  get headingLabel() {
    if (this.policy?.policyType) {
      return this.policy.policyType.charAt(0).toUpperCase() + this.policy.policyType.replace(/_/g, ' ').slice(1) + " Policy"; 
    } else {
      return 'Policy';
    }
  }

  // navigateToPolicy(policy: any) {
  //   const policyUrl = `/inventory/policy/${policy.collectionId}/${policy.activityType}/${policy.activityId}/${policy.policyId}`;
  //   window.open(policyUrl, '_blank');
  // }

}
