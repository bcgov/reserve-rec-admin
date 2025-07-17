import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Constants } from '../../app.constants';

@Component({
  selector: 'app-facility',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './facility.component.html',
  styleUrl: './facility.component.scss'
})
export class FacilityComponent {
  public data;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected cdr: ChangeDetectorRef
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['facility']) {
        this.data = data?.['facility'];
      }
    });
  }


  getFacilityTypeOption() {
    return Constants.facilityTypes[this.data?.facilityType] || { display: 'Unknown', value: 'unknown', iconClass: 'fa-solid fa-question' };
  }

  getFacilitySubTypeOption() {
    return Constants.facilityTypes[this.data?.facilityType]?.subTypes?.[this.data?.facilitySubType] || { display: 'None', value: '', iconClass: 'fa-solid fa-question' };
  }

  navToEdit() {
    if (this.data?.fcCollectionId && this.data?.facilityType && this.data?.facilityId) {
      this.router.navigate([`/inventory/facility/${this.data.fcCollectionId}/${this.data.facilityType}/${this.data.facilityId}/edit`]);
    }
    this.cdr.detectChanges();
  }

}
