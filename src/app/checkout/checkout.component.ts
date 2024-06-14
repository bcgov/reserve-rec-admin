import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { CheckoutService } from '../services/checkout.service';
import { DataService } from '../services/data.service';
// https://dev.na.bambora.com/docs/references/custom_checkout/ <-- Bambora Custom Checkout reference

declare var customcheckout: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {

  @Output() result = new EventEmitter<any>();

  public subscriptions = new Subscription;

  get setupData() {
    return this._setupData.value;
  }
  get profileData() {
    return this._profileData.value;
  }
  public _setupData = new BehaviorSubject<any>(null);
  public _profileData = new BehaviorSubject<any>(null);

  public cardNumber: any;
  public cardCvv: any;
  public cardExpiry: any;

  public cardNumberValid: boolean = false;
  public cardCvvValid: boolean = false;
  public cardExpiryValid: boolean = false;

  public customCheckoutValid: boolean = false;

  public customCheckout: any;
  public testCardNumber = '4030 0000 1000 1234';
  public defaultCopyText = 'Copy test card number';
  public copyText = this.defaultCopyText;
  public iframeStyle = {
    base: {
      fontFamily: 'BCSans, "Noto Sans", Verdana, Arial, sans serif',
      fontSize: '1rem',
      paddingTop: '0.2rem',
      paddingBottom: '0.2rem',
    },
    complete: {},
    empty: {},
    error: {
      color: 'red',
      ':focus': {
        fontStyle: 'italic',
      },
    }
  };
  public iframeClasses = {
    base: '',
    // complete: 'form-control',
    // empty: 'form-control',
    // error: 'form-control'
  };

  constructor(
    private checkoutService: CheckoutService,
    protected dataService: DataService
  ) {
    const subs = [
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
    this.customCheckout = new customcheckout();
    this.createCardNumber();
    this.createCvv();
    this.createExpiry();
    this.customCheckout.on('error', (value: any) => {
      if (value.field === 'card-number') {
        this.cardNumberValid = false;
      }
      if (value.field === 'cvv') {
        this.cardCvvValid = false;
      }
      if (value.field === 'expiry') {
        this.cardExpiryValid = false;
      }
    });
    this.customCheckout.on('complete', (value: any) => {
      if (value.field === 'card-number' && value.complete) {
        this.cardNumberValid = true;
      }
      if (value.field === 'cvv' && value.complete) {
        this.cardCvvValid = true;
      }
      if (value.field === 'expiry' && value.complete) {
        this.cardExpiryValid = true;
      }
    });
    this.customCheckout.on('brand', (event: any) => {

      var cardLogo = 'none';
      if (event.brand && event.brand !== 'unknown') {
        var filePath =
          'https://cdn.na.bambora.com/downloads/images/cards/' +
          event.brand +
          '.svg';
        cardLogo = 'url(' + filePath + ')';
      }
      const el = document.getElementById('card-number');
      if (el) {
        el.style.backgroundImage = cardLogo;
      }
    });
  }

  createCardNumber() {
    const options = {
      placeholder: 'Card number',
      style: this.iframeStyle,
      // classes: this.iframeClasses,
      brands: ['visa', 'mastercard', 'amex'],
    };
    this.cardNumber = this.customCheckout.create('card-number', options);
    this.cardNumber.mount('#card-number');
  }

  createCvv() {
    const options = {
      placeholder: 'CVV',
      style: this.iframeStyle,
    };
    this.cardCvv = this.customCheckout.create('cvv', options);
    this.cardCvv.mount('#card-cvv');
  }

  checkValidity() {
    return [this.cardNumberValid, this.cardCvvValid, this.cardExpiryValid].every((value) => value === true);
  }

  checkValidityBambora() {
    return this.setupData?.price > 0;
  }

  checkValidityCCPayment() {
    return this.checkValidity() && this.checkValidityBambora();

  }

  checkValidityOTP(): boolean {
    return this.checkValidity() && this.checkValidityBambora();

  }

  checkValidityProfile() {
    return this.checkValidity() && this.profileData.order.trnCardOwner;
  }

  createExpiry() {
    const options = {
      placeholder: 'MM / YY',
      style: this.iframeStyle,
    };
    this.cardExpiry = this.customCheckout.create('expiry', options);
    this.cardExpiry.mount('#card-expiry');
  }

  async createPaymentToken() {
    return await new Promise((resolve, reject) => {
      this.customCheckout.createToken((result: any) => {
        if (result.error) {
          reject(result.error);
        } else {
          this.result.emit({
            type: 'token',
            result: result
          });
          resolve(result);
        }
      });
    });
  }

  async createPaymentProfile() {
    let token = await this.createPaymentToken();
    let params = { ...this.profileData };
    params['token'] = token;
    let res = await this.checkoutService.createPaymentProfile(params);
    this.result.emit({
      type: 'profile',
      result: res
    });
  }

  async createCreditCardPayment() {
    let token = await this.createPaymentToken();
    let params = { ...this.profileData };
    params['token'] = token;
    let res = await this.checkoutService.submitPaymentRequest(params, 'token', this.setupData.price);
    this.result.emit({
      type: 'payment',
      result: res
    });
  };

  async createBamboraPayment() {
    let params = { ...this.profileData };
    params['order']['trnAmount'] = this.setupData.price;
    if (!params?.order?.trnCardOwner) {
      params['order']['trnCardOwner'] = params?.billing?.ordName;
    }
    let url = this.checkoutService.getCheckoutUrl(params);
    window.open(url, '_blank');
  };

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
