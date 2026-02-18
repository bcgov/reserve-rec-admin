import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-customer-edit',
  imports: [CommonModule],
  templateUrl: './customer-edit.component.html',
  styleUrl: './customer-edit.component.scss'
})
export class CustomerEditComponent implements OnInit {
  customer: any = null;
  customerId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id');
    
    // Get customer data from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || (window.history.state as any);
    
    if (state?.customer) {
      this.customer = state.customer;
    }
  }

  backToCustomerList() {
    this.router.navigate(['/customers']);
  }

  saveCustomer() {
    console.log('Save customer functionality coming soon');
    // TODO: Implement save functionality
  }
}
