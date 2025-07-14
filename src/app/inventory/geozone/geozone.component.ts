import { ChangeDetectorRef, Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { GeozoneDetailsComponent } from './geozone-details/geozone-details.component';
import { CommonModule, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-geozone',
  imports: [RouterOutlet, UpperCasePipe, CommonModule],
  templateUrl: './geozone.component.html',
  styleUrl: './geozone.component.scss'
})
export class GeozoneComponent {
  public data;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected cdr: ChangeDetectorRef
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['geozone']) {
        this.data = data?.['geozone'];
      }
    });
  }

  navToEdit() {
    if (this.data?.gzCollectionId && this.data?.geozoneId) {
      this.router.navigate([`/inventory/geozone/${this.data.gzCollectionId}/${this.data.geozoneId}/edit`]);
    }
    this.cdr.detectChanges();
  }

}
