import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import stripe from 'stripe';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';

declare var Stripe;

@Component({
  selector: 'app-stripe-checkout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stripe-checkout.component.html',
  styleUrl: './stripe-checkout.component.scss'
})
export class StripeCheckoutComponent implements OnInit, OnDestroy {

  @Output() result = new EventEmitter<any>();

  public subscriptions = new Subscription;

  public showPmtButton: boolean = false;
  public globalElements;

  get setupData() {
    return this._setupData.value;
  }
  get profileData() {
    return this._profileData.value;
  }
  public _setupData = new BehaviorSubject<any>(null);
  public _profileData = new BehaviorSubject<any>(null);
  public embeddedStripeElement;
  public stripe = new stripe('<YOUR_SECRET_KEY>');
  public stripeJs = Stripe('<YOUR_PUBLIC_KEY>');


  constructor(
    protected dataService: DataService
  ) {
    [
      this.dataService.watchItem('setupData').subscribe((value: any) => {
        if (value) {
          this._setupData.next(value);
        }
      }),
      this.dataService.watchItem('profileData').subscribe((value: any) => {
        if (value) {
          this._profileData.next(value);
        }
      })
    ].map(sub => this.subscriptions.add(sub));
  }

  ngOnInit(): void {
  }

  createEmbeddedPayment() {
    this.initStripeEmbedded();
  }

  async initStripeEmbedded() {
    const session = await this.createStripeCheckoutSession(true);
    this.embeddedStripeElement = await this.stripeJs.initEmbeddedCheckout(
      {
        clientSecret: session.client_secret
      }
    );
    this.embeddedStripeElement.mount('#checkout');
  }

  async stripeHostedCheckout() {
    const session = await this.createStripeCheckoutSession();
    window.open(session.url || undefined, '_blank');
  }

  async createStripeCheckoutSession(inline = false) {
    let session = {
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '1 x Rotating frog cube gif',
              images: ['https://media.tenor.com/e2Chpq1s0ToAAAAM/spinnig-frog-spinning-frog-on-a-record-white-screen.gif',
                'https://i.pinimg.com/originals/92/47/47/924747e016f9829ed284199ab4de857e.gif'
              ],
            },
            unit_amount: this.setupData.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:4200',
    };

    if (inline) {
      session['ui_mode'] = 'embedded';
      session['return_url'] = 'http://localhost:4200?session_id={CHECKOUT_SESSION_ID}';
      delete session['success_url'];
    }
    // @ts-ignore
    return await this.stripe.checkout.sessions.create(session);

  }

  async renderCustomFlow() {
    this.showPmtButton = true;
    const intent = await this.createPaymentIntent();
    const clientSecret = intent.client_secret;
    const appearance = {
      theme: 'stripe',
      rules: {
        '.Input': {
          border: '1px solid #ced4da',
          boxShadow: 'none',
          paddingTop: '0.6rem',
          paddingBottom: '0.6rem',
          paddingLeft: '0.8rem',
          paddingRight: '0.8rem'
        },
        '.Tab' :{
          border: '1px solid #ced4da',
          boxShadow: 'none',
        }
      },
      variables: {
        fontFamily: 'BCSans, "Noto Sans", Verdana, Arial, sans serif',
        borderRadius: '8px',
        colorPrimary: '#38598a',
        colorDanger: '#d8292f',
      }
    };
    this.globalElements = this.stripeJs.elements(
      {
        appearance,
        clientSecret
      }
    );

    const paymentElementOptions = {
      layout: 'tabs'
    };

    const paymentElement = this.globalElements.create('payment', paymentElementOptions);
    paymentElement.mount('#payment-form');
  }

  async createPaymentIntent() {
    let intent = {
      amount: this.setupData.price * 100,
      currency: 'cad',
      automatic_payment_methods: {
        enabled: true,
      },
    };
    return await this.stripe.paymentIntents.create(intent);
  }

  checkStripeCheckoutSession() {
    if (this.setupData.price) {
      return true;
    }
    return false;
  }

  async handleSubmit(event) {
    event.preventDefault();
    let elements = this.globalElements;

    const error = this.stripeJs.confirmPayment({
      elements,
      confirmParams: {
        return_url: 'http://localhost:4200',
      },
    });

  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
