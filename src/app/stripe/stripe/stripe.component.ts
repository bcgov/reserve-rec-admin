import { Component, OnDestroy } from '@angular/core';
import { StripeCheckoutComponent } from '../stripe-checkout/stripe-checkout.component';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-stripe',
  standalone: true,
  imports: [StripeCheckoutComponent],
  templateUrl: './stripe.component.html',
  styleUrl: './stripe.component.scss'
})
export class StripeComponent implements OnDestroy {

  public subscriptions = new Subscription;

  constructor(
    protected route: ActivatedRoute,
    protected dataService: DataService
  ) {
    this.subscriptions.add(
      this.route.data.subscribe(data => {
        if (data) {
          this.dataService.setItemValue('service', 'stripe');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
