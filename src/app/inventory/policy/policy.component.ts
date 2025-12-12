import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Constants } from '../../app.constants';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-policy',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './policy.component.html',
  styleUrl: './policy.component.scss',
  providers: [BsModalService]
})
export class PolicyComponent implements AfterViewInit {
  public data;

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    protected policyService: PolicyService,
    protected modalService: BsModalService
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['policy']) {
        this.data = data?.['policy'];
      }
    });
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  getPolicyColour() {
    const policyType = this.data?.policyType;
    for (const key in Constants.policyTypes) {
      if (Constants.policyTypes[key]?.value === policyType) {
        return `bg-policy-${policyType}`;
      }
    }
    return `bg-secondary`;
  }

  getPolicyIcon(policyType = null) {
    if (!policyType) {
      policyType = this.data?.policyType;
    }
    return `fa-solid me-1 fa-xl ` + (Constants.policyTypes[policyType].iconClass || 'fa-solid fa-question me-1 fa-xl');
  }

  getPolicyTypeOption() { }

  onDelete() { };

  navToEdit() { };

}
