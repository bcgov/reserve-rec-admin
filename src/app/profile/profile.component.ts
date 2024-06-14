import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { BehaviorSubject } from 'rxjs';
import { countries } from './countries';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgdsFormsModule, CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  @Input() set amount(value: any) {
    this._amount.next(value);
    this.amountStr = value?.toLocaleString('en-US', { minimumFractionDigits: 2 });
    this.tax = value - (value / (1 + this.taxRate));
    this.taxStr = this.tax?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.basePrice = value - this.tax;
    this.basePriceStr = this.basePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  @Output() formChange = new EventEmitter<any>();

  get amount() {
    return this._amount.value;
  }

  public _amount = new BehaviorSubject<any>(null);
  public amountStr: string = '0.00';
  public taxRate = 0.15;
  public tax: number = 0;
  public taxStr: string = '0.00';
  public basePrice: number = 0;
  public basePriceStr: string = '0.00';
  public form: any;
  public languages = [
    {
      value: 'eng',
      display: 'English'
    },
    {
      value: 'fre',
      display: 'French'
    }
  ];
  public provinces = [
    'BC',
    'AB',
    'SK',
    'MB',
    'ON',
    'QC',
    'NB',
    'NS',
    'PE',
    'NL',
    'YT',
    'NT',
    'NU'
  ];
  public countries = countries;

  constructor(
    protected dataService: DataService
  ) { }

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      order: new UntypedFormGroup({
        trnAmount: new UntypedFormControl(0, { nonNullable: true }), // The total amount for the transaction including tax and additional fees. Max 2 decimal places. Max 9 digits total.
        trnOrderNumber: new UntypedFormControl(''), // The invoice or order ID you want associated with the transaction. Up to 30 characters. Do not include spaces.
        // trnType: new UntypedFormControl('P'), // P - Purchase. PA - Pre-Authorization.
        trnCardOwner: new UntypedFormControl(''), // The name of the cardholder. 4-64 characters.
        trnLanguage: new UntypedFormControl(this.languages[0].value, { nonNullable: true }), // eng - English, fre - French.
      }),
      billing: new UntypedFormGroup({
        ordName: new UntypedFormControl(''), // The billed contact's name. Up to 64 characters.
        ordEmailAddress: new UntypedFormControl(''), // The email address of the billed contact and destination for email receipts in a valid email format. Up to 64 characters.
        ordAddress1: new UntypedFormControl(''), // The billing address for the card holder. With Address Verification, this will need to match the card issuer's records. Up to 32 characters.
        ordAddress2: new UntypedFormControl(''), // 	The second line for the card holder's billing address. Up to 32 characters
        ordCity: new UntypedFormControl(''), // The city associated with the billing address. Up to 32 characters.
        ordProvince: new UntypedFormControl(''), // The province or state associated with the billing address. As a variable, the two-letter ISO code.
        ordPostalCode: new UntypedFormControl(''), // The postal or ZIP code associated with the billing address. Up to 16 characters.
        ordCountry: new UntypedFormControl(''), // The country associated with the billing address. As a variable, the two-letter ISO code.
      }),
      shipping: new UntypedFormGroup({
        shipName: new UntypedFormControl(''), // The name of the recipient. Up to 64 characters.
        shipEmailAddress: new UntypedFormControl(''), // The email address of the recipient. Up to 64 characters.
        shipAddress1: new UntypedFormControl(''), // The shipping address for the recipient. Up to 32 characters.
        shipAddress2: new UntypedFormControl(''), // The second line for the recipient's shipping address. Up to 32 characters.
        shipCity: new UntypedFormControl(''), // The city associated with the shipping address. Up to 32 characters.
        shipProvince: new UntypedFormControl(''), // The province or state associated with the shipping address. As a variable, the two-letter ISO code.
        shipPostalCode: new UntypedFormControl(''), // The postal or ZIP code associated with the shipping address. Up to 16 characters.
        shipCountry: new UntypedFormControl(''), // The country associated with the shipping address. As a variable, the two-letter ISO code.
        shipPhoneAddress: new UntypedFormControl(''), // The phone number associated with the shipping address. Up to 16 characters.
      }),
      differentShipping: new UntypedFormControl(true, { nonNullable: true }),
      // differentCardHolderName: new UntypedFormControl(true, { nonNullable: true }),
      showBilling: new UntypedFormControl(false, { nonNullable: true }),
    });
    this.form.controls['differentShipping'].valueChanges.subscribe((value: any) => {
      if (value) {
        this.form.controls['shipping'].reset();
      }
    });
    this.form.controls['showBilling'].valueChanges.subscribe((value: any) => {
      if (!value) {
        this.form.controls['shipping'].reset();
        this.form.controls['billing'].reset();
      }
    });
    this.form.controls['billing'].controls['ordName'].valueChanges.subscribe((value: any) => {
      if (this.form.controls['differentCardHolderName'].value === true) {
        this.form.controls['order'].controls['trnCardOwner'].setValue(value);
      }
    });
    this.form.valueChanges.subscribe(() => {
      this.dataService.setItemValue('profileData', this.form.value);
      this.formChange.emit(this.form.value);
    });
  }

  test() {
    console.log('this.form.value:', this.form.value);
  }


}
