import { Routes } from '@angular/router';
import { StripeComponent } from './stripe/stripe/stripe.component';
import { BamboraComponent } from './bambora/bambora/bambora.component';

export const routes: Routes = [
  {
    path: 'stripe',
    component: StripeComponent,
    data: {
      service: 'stripe'
    }
  },
  {
    path: 'bambora',
    component: BamboraComponent,
    data: {
      service: 'bambora'
    }
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
