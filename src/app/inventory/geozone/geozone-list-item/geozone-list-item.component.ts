import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  navigateToGeozone(geozone: any) {
    const geozoneUrl = `/inventory/geozone/${geozone.collectionId}/${geozone.geozoneId}`;
    this.router.navigateByUrl(geozoneUrl);
  }

}
