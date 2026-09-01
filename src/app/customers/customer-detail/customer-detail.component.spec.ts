import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { CustomerDetailComponent } from './customer-detail.component';
import { CustomerService } from '../../services/customer.service';
import { LoggerService } from '../../services/logger.service';

describe('CustomerDetailComponent', () => {
  let component: CustomerDetailComponent;
  let fixture: ComponentFixture<CustomerDetailComponent>;

  let mockCustomerService: any;
  let mockLoggerService: any;

  const SUB = 'cognito-sub-123';
  const now = Date.now();

  const reservedBooking = {
    bookingId: 'r1',
    displayName: 'Joffre Lakes, Day-use pass',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    reservationContext: { checkInTime: now + 100000, checkOutTime: now + 200000 },
  };
  const activeBooking = {
    bookingId: 'a1',
    displayName: 'Garibaldi, Backcountry camping',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    reservationContext: { checkOutTime: now + 100000 },
  };
  const expiredBooking = {
    bookingId: 'e1',
    displayName: 'Golden Ears, Day-use pass',
    startDate: '2025-07-01',
    endDate: '2025-07-01',
    reservationContext: { checkOutTime: now - 100000 },
  };
  const cancelledBooking = {
    bookingId: 'c1',
    displayName: 'Mount Seymour, Day-use pass',
    status: 'cancelled',
    startDate: '2025-08-01',
    endDate: '2025-08-01',
  };
  const inProgressBooking = {
    bookingId: 'p1',
    displayName: 'Cypress, Day-use pass',
    status: 'in progress',
    startDate: '2026-09-01',
    endDate: '2026-09-01',
    reservationContext: { checkInTime: now + 100000, checkOutTime: now + 200000 },
  };

  function setup(bookingsResponse: any = { data: { items: [], lastEvaluatedKey: null } }) {
    mockCustomerService = {
      selectedCustomer: { givenName: 'Jane', familyName: 'Camper', email: 'jane@example.com' },
      getCustomerBookings: jest.fn().mockResolvedValue(bookingsResponse),
    };
    mockLoggerService = { error: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [CustomerDetailComponent],
      providers: [
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => SUB } } },
        },
      ],
    }).compileComponents();
  }

  async function create() {
    fixture = TestBed.createComponent(CustomerDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', async () => {
    await setup();
    await create();
    expect(component).toBeTruthy();
  });

  it('fetches bookings for the sub in the route', async () => {
    await setup();
    await create();

    expect(component.customerId).toBe(SUB);
    expect(mockCustomerService.getCustomerBookings).toHaveBeenCalledWith(
      SUB,
      expect.objectContaining({ limit: 20 })
    );
  });

  it('splits bookings into current and past', async () => {
    await setup({
      data: {
        items: [reservedBooking, expiredBooking, activeBooking, cancelledBooking],
        lastEvaluatedKey: null,
      },
    });
    await create();

    expect(component.currentBookings.map((b) => b.bookingId)).toEqual(['r1', 'a1']);
    // Past is sorted newest-first by startDate: 2025-08-01 (c1) then 2025-07-01 (e1)
    expect(component.pastBookings.map((b) => b.bookingId)).toEqual(['c1', 'e1']);
    expect(component.hasMoreBookings).toBe(false);
  });

  it('leaves an in-progress booking out of both lists', async () => {
    await setup({
      data: { items: [reservedBooking, inProgressBooking, expiredBooking], lastEvaluatedKey: null },
    });
    await create();

    expect(component.currentBookings.map((b) => b.bookingId)).toEqual(['r1']);
    expect(component.pastBookings.map((b) => b.bookingId)).toEqual(['e1']);
  });

  it('sorts past bookings newest first', async () => {
    await setup({
      data: {
        items: [
          { bookingId: 'old', status: 'cancelled', startDate: '2024-01-01' },
          { bookingId: 'new', status: 'cancelled', startDate: '2026-01-01' },
          { bookingId: 'mid', status: 'cancelled', startDate: '2025-01-01' },
        ],
        lastEvaluatedKey: null,
      },
    });
    await create();

    expect(component.pastBookings.map((b) => b.bookingId)).toEqual(['new', 'mid', 'old']);
  });

  it('renders empty states when the customer has no bookings', async () => {
    await setup();
    await create();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No current bookings');
    expect(text).toContain('No past bookings');
  });

  it('appends the next page when loading more', async () => {
    await setup({ data: { items: [reservedBooking], lastEvaluatedKey: { pk: 'x', sk: 'y' } } });
    await create();

    expect(component.hasMoreBookings).toBe(true);

    mockCustomerService.getCustomerBookings.mockResolvedValue({
      data: { items: [expiredBooking], lastEvaluatedKey: null },
    });
    await component.loadBookings(true);

    expect(mockCustomerService.getCustomerBookings).toHaveBeenLastCalledWith(
      SUB,
      expect.objectContaining({ lastEvaluatedKey: { pk: 'x', sk: 'y' } })
    );
    expect(component.currentBookings.map((b) => b.bookingId)).toEqual(['r1']);
    expect(component.pastBookings.map((b) => b.bookingId)).toEqual(['e1']);
    expect(component.hasMoreBookings).toBe(false);
  });

  it('shows an error state when the bookings request fails', async () => {
    await setup();
    mockCustomerService.getCustomerBookings.mockRejectedValue(new Error('boom'));
    await create();

    expect(component.bookingsError).toBeTruthy();
    expect(mockLoggerService.error).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Unable to load bookings');
  });

  it('keeps already-loaded bookings when a further page fails', async () => {
    await setup({ data: { items: [reservedBooking], lastEvaluatedKey: { pk: 'x', sk: 'y' } } });
    await create();

    mockCustomerService.getCustomerBookings.mockRejectedValue(new Error('boom'));
    await component.loadBookings(true);
    fixture.detectChanges();

    expect(component.currentBookings.map((b) => b.bookingId)).toEqual(['r1']);
    expect(component.bookingsError).toBeTruthy();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Unable to load bookings');
    expect(text).toContain('Joffre Lakes');
    expect(text).not.toContain('No current bookings');
  });

  it('retries the page that failed', async () => {
    await setup({ data: { items: [reservedBooking], lastEvaluatedKey: { pk: 'x', sk: 'y' } } });
    await create();

    mockCustomerService.getCustomerBookings.mockRejectedValue(new Error('boom'));
    await component.loadBookings(true);

    mockCustomerService.getCustomerBookings.mockResolvedValue({
      data: { items: [expiredBooking], lastEvaluatedKey: null },
    });
    await component.retryLoadBookings();

    expect(component.currentBookings.map((b) => b.bookingId)).toEqual(['r1']);
    expect(component.pastBookings.map((b) => b.bookingId)).toEqual(['e1']);
    expect(component.bookingsError).toBeNull();
  });

  it('ignores a second load while one is already in flight', async () => {
    await setup();
    await create();

    mockCustomerService.getCustomerBookings.mockClear();

    const first = component.loadBookings(true);
    const second = component.loadBookings(true);
    await Promise.all([first, second]);

    expect(mockCustomerService.getCustomerBookings).toHaveBeenCalledTimes(1);
  });
});
