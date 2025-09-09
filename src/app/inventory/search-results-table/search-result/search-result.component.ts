import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-search-result',
  imports: [CommonModule, DatePipe, UpperCasePipe],
  templateUrl: './search-result.component.html',
  styleUrl: './search-result.component.scss'
})
export class SearchResultComponent {
  @Input() data: any;

  constructor(
    protected router: Router,
    protected loadingService: LoadingService,
    protected cdr: ChangeDetectorRef
  ) { }

  getBadgeClass(schema) {
    switch (schema) {
      case 'protectedArea':
        return 'bg-success';
      case 'facility':
        return 'bg-primary';
      case 'activity':
        return 'bg-danger';
      case 'product':
        return 'bg-info text-dark';
      case 'geozone':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  getBadgeIcon(schema) {
    switch (schema) {
      case 'protectedArea':
        return 'fa-solid fa-tree';
      case 'facility':
        return 'fa-solid fa-location-dot';
      case 'activity':
        return 'fa-solid fa-campground';
      case 'product':
        return 'fa-solid fa-ticket text-dark';
      case 'geozone':
        return 'fa-solid fa-map-location-dot text-dark';
      default:
        return 'fa-solid fa-circle-question';
    }
  }

  onSelect(data) {
    let route: any = null;
    switch (data?.schema) {
      case 'protectedArea':
        route = `inventory/protected-area/${data?.orcs}`;
        break;
      case 'facility':
        route = `inventory/facility/${data?.collectionId}/${data?.facilityType}/${data?.facilityId}`;
        break;
      case 'activity':
        route = `inventory/activity/${data?.collectionId}/${data?.activityType}/${data?.activityId}`;
        break;
      case 'product':
        route = `inventory/product/${data.id}`;
        break;
      case 'geozone':
        route = `inventory/geozone/${data?.collectionId}/${data?.geozoneId}`;
        break;
      default:
        console.warn('Unknown schema type:', data?.schema);
    }
    if (route) {
      console.log('route:', route);
      this.router.navigate([route]);
      this.cdr.detectChanges();
    }
  }
}
