import { Component } from '@angular/core';
import { SetupFormComponent } from '../../setup-form/setup-form.component';
import { CheckoutComponent } from '../../checkout/checkout.component';
import { ProfileComponent } from '../../profile/profile.component';
import { ResultListComponent } from '../../result-list/result-list.component';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-bambora',
  standalone: true,
  imports: [SetupFormComponent, CheckoutComponent, ProfileComponent, ResultListComponent],
  templateUrl: './bambora.component.html',
  styleUrl: './bambora.component.scss'
})
export class BamboraComponent {

  public subscriptions = new Subscription;

  constructor(
    protected route: ActivatedRoute,
    protected dataService: DataService
  ) {
    this.subscriptions.add(
      this.route.data.subscribe(data => {
        if (data) {
          this.dataService.setItemValue('service', 'bambora');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
