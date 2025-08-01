import { Component, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-protected-area',
  imports: [],
  templateUrl: './protected-area.component.html',
  styleUrl: './protected-area.component.scss'
})
export class ProtectedAreaComponent {
  public _protectedAreaData: WritableSignal<any[]> = signal([]);

  constructor(
    protected route: ActivatedRoute,
    protected router: Router
  ) {
    this.route.data.subscribe((data) => {
      if (data?.['protected-area']) {
        let nextData = data['protected-area'];
        if (data?.['protected-area']?.items) {
          nextData = data['protected-area'].items[0];
        }
        this._protectedAreaData.set(nextData);
      }
    });
  }

}
