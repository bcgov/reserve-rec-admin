import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CheckoutService } from '../services/checkout.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-result-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-list.component.html',
  styleUrl: './result-list.component.scss'
})
export class ResultListComponent {
  @Input()set dataList (value: any[]) {
    this._dataList.next(value);
  }

  get dataList() {
    return this._dataList.value;
  }

  public _dataList = new BehaviorSubject<any[]>([]);

  constructor(
    private checkoutService: CheckoutService
  ) {

  }

  getPaymentClass(data: any) {
    if (data?.approved === "1") {
      return 'payment-success';
    }
    return 'payment-failure';
  }

  getProfileClass(data: any) {
    if (data?.code === 1) {
      return 'payment-success';
    }
    return 'payment-failure';
  }

  printObj(data: any, stringify: boolean = false) {
    // if (stringify) {
    //   data = JSON.stringify(data, null, 2);
    // }
    return Object.entries(data).map(([key, value]) => `<div class="col-6"><strong>${key}:</strong> ${value}</div>`).join('');
  }
}
