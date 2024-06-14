import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { OutsourceCheckoutComponent } from '../outsource-checkout/outsource-checkout.component';
import { cardBrands } from './cardBrands';
import { DataService } from '../services/data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { stripe_cardBrands, stripe_cardCountries, stripe_declined, stripe_fraud } from './stripe_cardBrands';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-setup-form',
  standalone: true,
  imports: [NgdsFormsModule, OutsourceCheckoutComponent, CommonModule],
  templateUrl: './setup-form.component.html',
  styleUrl: './setup-form.component.scss'
})
export class SetupFormComponent implements OnInit, OnDestroy {
  @Input() service: any;
  @Output() formChange = new EventEmitter<any>();
  @Output() price = new EventEmitter<any>();

  public form: any;
  public subscriptions = new Subscription;
  public cardNumber: any;
  public cardCvv: any;
  public cardExpiry: any;
  public globalExpiry = '1225';
  public services = [
    {
      value: 'bambora',
      display: 'Bambora',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Bambora_logo.png'
    },
    {
      value: 'stripe',
      display: 'Stripe',
      icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRek2EqBo5YIE0TPMVMlIFA594WZZeuqYdAQQ&s'
    }
  ];
  public cardBrands = cardBrands.map((brand: any) => {
    return {
      value: brand,
      display: brand.name
    };
  });
  public stripe_cardCountries = stripe_cardCountries.map((country: any) => {
    return {
      value: country,
      display: country.name
    };
  });
  public stripe_declined = stripe_declined.map((declined: any) => {
    return {
      value: declined,
      display: declined.name
    };
  });
  public stripe_fraud = stripe_fraud.map((fraud: any) => {
    return {
      value: fraud,
      display: fraud.name
    };
  });
  public stripe_cardBrands = stripe_cardBrands.map((brand: any) => {
    return {
      value: brand,
      display: brand.name
    };
  });
  public categories = [
    {
      value: 'brand',
      display: 'Card Brand'
    },
    {
      value: 'country',
      display: 'Card Country'
    },
    {
      value: 'declined',
      display: 'Card Declined'
    },
    {
      value: 'fraud',
      display: 'Card Fraud'
    }
  ];
  public actions: any[] = [];


  constructor(
    protected dataService: DataService,
    protected router: Router,
    protected route: ActivatedRoute
  ) {
    [
      this.dataService.watchItem('service').subscribe((value: any) => {
        if (value) {
          this.service = value;
          if (this.form.controls['service'] && this.form.controls['service'].value !== value) {
            this.form.controls['service'].setValue(value);
          }
        }
      }),
      this.route.data.subscribe((data: any) => {
        if (data.service) {
          this.service = data.service;
        }
      }),
    ].map(sub => this.subscriptions.add(sub));
  }

  ngOnInit() {
    this.form = new UntypedFormGroup({
      service: new UntypedFormControl(this.service || this.services[0]),
      price: new UntypedFormControl(''),
      cardBrand: new UntypedFormControl(''),
      action: new UntypedFormControl(''),
      stripe_category: new UntypedFormControl(''),
      stripe_cardBrand: new UntypedFormControl(''),
      stripe_cardCountry: new UntypedFormControl(''),
      stripe_declined: new UntypedFormControl(''),
      stripe_fraud: new UntypedFormControl(''),
    });
    this.form.controls['price'].valueChanges.subscribe((value: any) => {
      this.price.emit(value);
    });
    this.form.controls['cardBrand'].valueChanges.subscribe((value: any) => {
      this.onBrandChange(value);
    });
    this.form.valueChanges.subscribe(() => {
      this.dataService.setItemValue('setupData', this.form.value);
      this.formChange.emit(this.form.value);
      this.setCurrentValues();
    });
    this.form.controls['service'].valueChanges.subscribe((value: any) => {
      if (value) {
        this.dataService.setItemValue('service', value);
        this.router.navigate([`${value}`]);
      }
    });
  }

  resetForm() {
    this.form.reset();
  }

  setCurrentValues() {
    const values = this.form.value;
    if (this.service === 'bambora') {
      if (values?.cardBrand && values?.action) {
        this.cardNumber = values.cardBrand[values.action];
        this.cardCvv = values.cardBrand.cvv;
        this.cardExpiry = this.globalExpiry;
      }
    } else if (this.service === 'stripe') {
      if (values?.stripe_category) {
        if (values?.stripe_cardBrand) {
          this.cardNumber = values.stripe_cardBrand.number;
        }
        if (values?.stripe_cardCountry) {
          this.cardNumber = values.stripe_cardCountry.number;
        }
        if (values?.stripe_declined) {
          this.cardNumber = values.stripe_declined.number;
        }
        if (values?.stripe_fraud) {
          this.cardNumber = values.stripe_fraud.number;
        }
      }
    }
  }

  getCCImage(brand: any) {
    return brand.icon;
  }

  copyToClipboard(value: any) {
    navigator.clipboard.writeText(value);
  }

  onBrandChange(brand: any) {
    this.actions = [
      {
        value: 'approvedNumber',
        display: 'Approve'
      },
      {
        value: 'declinedNumber',
        display: 'Decline'
      },
    ];
    if (brand?.timeoutApprovedNumber) {
      this.actions.push({
        value: 'timeoutApprovedNumber',
        display: 'Approve after 45+ seconds'
      });
    }
    if (brand?.timeoutDeclinedNumber) {
      this.actions.push({
        value: 'timeoutDeclinedNumber',
        display: 'Decline after 45+ seconds'
      });
    }
    if (brand?.noResponseErrorDeclinedNumber) {
      this.actions.push({
        value: 'noResponseErrorDeclinedNumber',
        display: 'Decline after 45+ seconds (No transaction response)'
      });
    }
    if (brand?.visaTimeoutErrorDeclinedNumber) {
      this.actions.push({
        value: 'visaTimeoutErrorDeclinedNumber',
        display: 'Decline after 45+ seconds (VISA 158 Declined - TIMEOUT)'
      });
    }
    if (brand?.noDeviceErrorDeclinedNumber) {
      this.actions.push({
        value: 'noDeviceErrorDeclinedNumber',
        display: 'Decline after 45+ seconds (No available device)'
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
