import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-customer-detail',
  imports: [CommonModule],
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss'
})
export class CustomerDetailComponent implements OnInit {
  customer: any = null;
  customerId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private logger: LoggerService
  ) {}

  async ngOnInit() {
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

  editCustomer() {
    console.log('Determine edit functionality');
  }

  getFullName(): string {
    const firstName = this.customer?.givenName || '';
    const lastName = this.customer?.familyName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || '-';
  }

  isEmailVerified(): boolean {
    const status = this.customer?.userStatus;
    // BCSC accounts are always considered email verified
    if (status === 'EXTERNAL_PROVIDER') {
      return true;
    }
    // BCP Accounts use the actual email_verified field
    if (status === 'CONFIRMED' || status === 'UNCONFIRMED') {
      return this.customer?.email_verified === true;
    }
    return false;
  }

  printCustomer() {
    console.log('Print customer button was pressed');
    // TODO: Waiting for designs on how this should look/function
  }

  addSale() {
    console.log('Add sale button was pressed');
    // TODO: On designs but functionality not determined
  }
}
