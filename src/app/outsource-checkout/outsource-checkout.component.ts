import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
// Visit https://developer.bambora.com/europe/sdk/web-sdk/introduction for more information on Bambora SDK
// import * as Bambora from '@bambora/checkout-sdk-web'
declare var customcheckout: any;

@Component({
  selector: 'app-outsource-checkout',
  standalone: true,
  imports: [NgdsFormsModule],
  templateUrl: './outsource-checkout.component.html',
  styleUrl: './outsource-checkout.component.scss'
})
export class OutsourceCheckoutComponent implements OnInit {
  @Input() price: number = 0;

  public form: any;

  public customCheckout: any;

  ngOnInit(): void {
    // this.customCheckout = new customcheckout();
    // console.log('this.customCheckout:', this.customCheckout);
    // this.form = new UntypedFormGroup({
    //   cardNumber: new UntypedFormControl(''),
    //   cvv: new UntypedFormControl(''),
    //   expiryMonth: new UntypedFormControl(''),
    // });
  }

  useExternalCheckout(event: any){
  //   var callback = function(result: any) {
  //     console.log('token result : ' + JSON.stringify(result));

  //     if (result.error) {
  //       console.log('result.error:', result.error);
  //     } else {
  //       console.log('result:', result);
  //     }
  //   };
  //   this.customCheckout.createToken(callback)
  }
}
