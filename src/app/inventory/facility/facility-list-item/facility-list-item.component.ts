import { Component, Input, OnInit } from '@angular/core';
import { Constants } from '../../../app.constants';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-facility-list-item',
  imports: [CommonModule],
  templateUrl: './facility-list-item.component.html',
  styleUrl: './facility-list-item.component.scss'
})
export class FacilityListItemComponent implements OnInit {
  @Input() facility: any;
  @Input() showDetailsButton: boolean = true;

  public constantsData = null;

  ngOnInit(): void {
    this.constantsData = Constants.facilityTypes[this.facility?.facilityType] || { displayName: 'Unknown', icon: 'question-circle' };
  }

  navigateToFacility(facility: any) {
    const facilityUrl = `/inventory/facility/${facility.collectionId}/${facility.facilityType}/${facility.facilityId}`;
    window.open(facilityUrl, '_blank');
  }

}
