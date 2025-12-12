import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService } from '../../../services/policy.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { CommonModule, DatePipe } from '@angular/common';
import { Constants } from '../../../app.constants';

@Component({
  selector: 'app-policy-details',
  imports: [CommonModule, DatePipe],
  templateUrl: './policy-details.component.html',
  styleUrl: './policy-details.component.scss'
})
export class PolicyDetailsComponent {

  public policy;

  constructor(
    protected router: Router,
    protected cdr: ChangeDetectorRef,
    protected route: ActivatedRoute,
    protected policyService: PolicyService,
    protected modalService: BsModalService
  ) {
    if (this.route.snapshot.data['policy']) {
      this.policy = this.route.snapshot.data['policy'];
      console.log('policy:', this.policy);
    }
  }

  getPolicyColour() {
    const policyType = this.policy?.policyType;
    for (const key in Constants.policyTypes) {
      if (Constants.policyTypes[key]?.value === policyType) {
        return `bg-policy-${policyType}`;
      }
    }
    return `bg-secondary`;
  }

    getPolicyIcon(policyType = null) {
    if (!policyType) {
      policyType = this.policy?.policyType;
    }
    return `fa-solid me-1 fa-xl ` + (Constants.policyTypes?.[policyType]?.iconClass || 'fa-solid fa-question me-1 fa-xl');
  }


  getDurationUnitArray(duration) {
    const units = [];
    for (const key in duration) {
      if (duration[key] && Object.prototype.hasOwnProperty.call(duration, key)) {
        const name = key;
        units.push({ name: name, value: duration[key] });
      }
    }
    return units;
  }

  formatDuration(duration) {
    const units = this.getDurationUnitArray(duration);
    const parts = [];
    units.forEach((unit) => {
      parts.push(`${unit.value} ${unit.name}`);
    });
    const durationString = parts.join(', ');
    return durationString.trim();
  }

  formatTime(time) {
    const hour = time?.hour?.toString().padStart(2, '0') || '00';
    const minute = time?.minute?.toString().padStart(2, '0') || '00';
    const timeString = hour + ':' + minute;
    return timeString;
  }

}
