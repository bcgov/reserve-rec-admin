import { AfterViewChecked, ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CreateInventorySelectorComponent } from '../../create-inventory-selector/create-inventory-selector.component';
import { CommonModule } from '@angular/common';
import { Constants } from '../../../../app.constants';

@Component({
  selector: 'app-policy-create-selector',
  imports: [CreateInventorySelectorComponent, RouterOutlet, CommonModule],
  templateUrl: './policy-create-selector.component.html',
  styleUrl: './policy-create-selector.component.scss'
})
export class PolicyCreateSelectorComponent implements AfterViewChecked {

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef
  ) { }

  ngAfterViewChecked(): void {
    // This is a workaround to ensure that the router outlet is updated after the view is checked
    // This is necessary because the router outlet may not update immediately after navigation
    this.cdr.detectChanges();
  }

  showSelectionOptions(): boolean {
    const urlParts = this.router.url.split('/');
    if (urlParts[urlParts.length - 2] === 'create') {
      return true;
    }
    return false;
  }

  getPolicyIcon(policyType) {
    if (!policyType) {
      policyType = this.getPolicyTypeFromUrl().toLowerCase();
    }
    return `fa-solid` + (Constants.policyTypes[policyType]?.iconClass || 'fa-solid fa-question');
  }

  getPolicyTypeFromUrl() : string {
    const urlParts = this.router.url.split('/');
    const policyType = urlParts[urlParts.length - 1];
    if (policyType === 'booking' || policyType === 'change' || policyType === 'party' || policyType === 'fee') {
      return policyType.charAt(0).toUpperCase() + policyType.slice(1);
    } return '';
  }

}
