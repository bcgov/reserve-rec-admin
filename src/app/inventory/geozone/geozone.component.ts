import { Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeozoneDetailsComponent } from './geozone-details/geozone-details.component';
import { GeozoneEditComponent } from './geozone-edit/geozone-edit.component';

@Component({
  selector: 'app-geozone',
  imports: [GeozoneDetailsComponent, GeozoneEditComponent],
  templateUrl: './geozone.component.html',
  styleUrl: './geozone.component.scss'
})
export class GeozoneComponent {
  public _geozoneData: WritableSignal<any[]> = signal([]);

  constructor(
    protected route: ActivatedRoute,
    protected router: Router
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['geozone']) {
        let nextData = data['geozone'];
        if (data?.['geozone']?.items) {
          nextData = data['geozone'].items[0];
        }
        this._geozoneData.set(nextData);
      }
    });
  }

}
