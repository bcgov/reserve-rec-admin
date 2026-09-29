import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { CustomersComponent } from './customers.component';
import { CustomerService } from '../services/customer.service';
import { LoggerService } from '../services/logger.service';
import { LoadingService } from '../services/loading.service';

describe('CustomersComponent', () => {
  let component: CustomersComponent;
  let fixture: ComponentFixture<CustomersComponent>;

  let mockCustomerService: any;
  let mockLoggerService: any;

  // Fresh objects per test - the component writes hasActiveBooking onto the customer.
  const withBooking = () => ({ sub: 'sub-1', email: 'a@example.com', givenName: 'A', familyName: 'Camper' });
  const withoutBooking = () => ({ sub: 'sub-2', email: 'b@example.com', givenName: 'B', familyName: 'Camper' });

  function setup(users: any[] = [], subsWithBooking: string[] = []) {
    mockCustomerService = {
      searchCustomers: jest.fn().mockResolvedValue({ data: { hits: users } }),
      getSubsWithCurrentBooking: jest.fn().mockResolvedValue(new Set(subsWithBooking)),
    };
    mockLoggerService = { info: jest.fn(), error: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: LoadingService, useValue: { addToFetchList: jest.fn(), removeFromFetchList: jest.fn() } },
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    }).compileComponents();
  }

  async function create() {
    fixture = TestBed.createComponent(CustomersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Two passes: the first settles the customer search, the second the booking
    // lookup it kicks off.
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('asks for the active booking flags of the customers it just loaded', async () => {
    await setup([withBooking(), withoutBooking()], ['sub-1']);
    await create();

    expect(mockCustomerService.getSubsWithCurrentBooking).toHaveBeenCalledWith(['sub-1', 'sub-2']);
  });

  it('shows yes only for customers holding a current booking', async () => {
    await setup([withBooking(), withoutBooking()], ['sub-1']);
    await create();

    expect(component.getValue(component.customers[0], 'activeBooking')).toBe('yes');
    expect(component.getValue(component.customers[1], 'activeBooking')).toBe('no');
  });

  it('falls back to a dash when the booking lookup fails', async () => {
    await setup([withBooking()], []);
    mockCustomerService.getSubsWithCurrentBooking.mockRejectedValue(new Error('opensearch down'));
    await create();

    expect(component.getValue(component.customers[0], 'activeBooking')).toBe('-');
    expect(mockLoggerService.error).toHaveBeenCalled();
  });
});
