import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-geozone-list-item',
  imports: [CommonModule],
  templateUrl: './geozone-list-item.component.html',
  styleUrl: './geozone-list-item.component.scss'
})
export class GeozoneListItemComponent {
  @Input() geozone: any;
  @Input() showDetailsButton: boolean = true;

  public constantsData = null;

  navigateToGeozone(geozone: any) {
    const geozoneUrl = `/inventory/geozone/${geozone.collectionId}/${geozone.geozoneId}`;
    window.open(geozoneUrl, '_blank');
  }

}
