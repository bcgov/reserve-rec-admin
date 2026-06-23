import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PassDetailsComponent } from './pass-details.component';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';

describe('PassDetailsComponent', () => {
  let component: PassDetailsComponent;
  let fixture: ComponentFixture<PassDetailsComponent>;

  let mockApiService: any;
  let mockToastService: any;
  let mockLoggerService: any;

  const fixedDate = new Date('2026-06-11T00:00:00Z');

  function createMockFn(implementation: (...args: any[]) => any) {
    if (typeof jest !== 'undefined') {
      return jest.fn(implementation);
    }

    return jasmine.createSpy().and.callFake(implementation);
  }

  function setMockReturnValue(mockFn: any, value: any) {
    if (typeof jest !== 'undefined') {
      mockFn.mockReturnValue(value);
      return;
    }

    mockFn.and.returnValue(value);
  }

  function setSystemDate(date: Date) {
    if (typeof jest !== 'undefined') {
      jest.useFakeTimers();
      jest.setSystemTime(date);
      return;
    }

    jasmine.clock().install();
    jasmine.clock().mockDate(date);
  }

  function restoreSystemDate() {
    if (typeof jest !== 'undefined') {
      jest.useRealTimers();
      return;
    }

    jasmine.clock().uninstall();
  }

  const mockBooking = {
    bookingId: '123456',
    firstName: 'John',
    lastName: 'Camper',
    email: 'john@example.com',
    status: 'confirmed',
    startDate: '2024-01-01',
    activityType: 'dayuse',
    partySize: 2,
    reservationContext: {
      checkOutTime: Date.now() + 1000000
    }
  };

  beforeEach(async () => {
    mockApiService = {
      put: createMockFn((path: string, body: any) => of({ data: { success: true } }))
    };

    mockToastService = {
      addMessage: createMockFn((msg: string, title: string, type: string) => { })
    };

    mockLoggerService = {
      error: createMockFn((err: any) => { })
    };

    await TestBed.configureTestingModule({
      imports: [PassDetailsComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LoggerService, useValue: mockLoggerService }
      ]
    }).compileComponents();

    setSystemDate(fixedDate);

    fixture = TestBed.createComponent(PassDetailsComponent);
    component = fixture.componentInstance;
    component.booking = { ...mockBooking };
    fixture.detectChanges();
  });

  afterEach(() => {
    restoreSystemDate();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get booking name correctly', () => {
    expect(component.getBookingName(mockBooking)).toBe('John Camper');
    expect(component.getBookingName({ firstName: 'Jane' })).toBe('Jane');
    expect(component.getBookingName({})).toBe('Unknown');
  });

  it('should check-in a booking successfully', async () => {
    const apiSpy = mockApiService.put;
    const toastSpy = mockToastService.addMessage;
    
    await component.checkinBooking(component.booking);
    
    expect(apiSpy).toHaveBeenCalledWith('bookings/123456/checkin', {});
    expect(component.booking.checkedInTime).toBeDefined();
    expect(toastSpy).toHaveBeenCalledWith('Check-in successful', 'Success', ToastTypes.SUCCESS);
  });

  it('should handle check-in failure', async () => {
    const error = { message: 'Failed' };
    setMockReturnValue(mockApiService.put, throwError(() => error));
    const loggerSpy = mockLoggerService.error;
    const toastSpy = mockToastService.addMessage;
    
    await component.checkinBooking(component.booking);
    
    expect(loggerSpy).toHaveBeenCalledWith(error);
    expect(toastSpy).toHaveBeenCalledWith('Failed', 'Check-in failed', ToastTypes.ERROR);
  });

  it('should determine display status correctly', () => {
    const now = Date.now();
    expect(component.getDisplayStatus({ status: 'cancelled' })).toBe('Cancelled');
    expect(component.getDisplayStatus({ 
      checkedInTime: now, 
      reservationContext: { checkOutTime: now + 1000 } 
    })).toBe('Active');
    expect(component.getDisplayStatus({ 
      reservationContext: { checkOutTime: now - 1000 } 
    })).toBe('Expired');
    expect(component.getDisplayStatus({ 
      status: 'confirmed', 
      reservationContext: { checkOutTime: now + 1000 } 
    })).toBe('Reserved');
  });

  it('should restrict check-in permissions based on booking status and window', () => {
    const now = Date.now();

    // Must be confirmed
    expect(component.canCheckIn({ 
      status: 'cancelled', 
      reservationContext: { checkOutTime: now + 100000 } 
    })).toBe(false);

    // Cannot check in if already checked in
    expect(component.canCheckIn({ 
      status: 'confirmed', 
      checkedInTime: '1718112000', 
      reservationContext: { checkOutTime: now + 100000 } 
    })).toBe(false);

    // Cannot check in if the checkout time has passed (Expired)
    expect(component.canCheckIn({ 
      status: 'confirmed', 
      reservationContext: { checkOutTime: now - 100000 } 
    })).toBe(false);

    // Valid scenario
    expect(component.canCheckIn({ 
      status: 'confirmed', 
      reservationContext: { checkOutTime: now + 100000 } 
    })).toBe(true);
  });

  it('should calculate the party size correctly across varying data models', () => {
    // Explicit property checks
    expect(component.getPartySize({ partySize: 4 })).toBe(4);

    // Broken down demographic totals checks
    const structuralBooking = {
      partyInformation: { adult: 2, senior: 1, youth: 1, child: 1 }
    };
    expect(component.getPartySize(structuralBooking)).toBe(5);

    // Secondary variable property check
    expect(component.getPartySize({ numberOfGuests: 3 })).toBe(3);

    // Fallback security checks
    expect(component.getPartySize({})).toBe(0);
  });

  it('should fallback gracefully when looking for a user email', () => {
    expect(component.getBookingEmail({ email: 'email@bcparks.ca' })).toBe('email@bcparks.ca');
    expect(component.getBookingEmail({ 
      namedOccupant: { contactInfo: { email: 'email2@bcparks.ca' } } 
    })).toBe('email2@bcparks.ca');
    expect(component.getBookingEmail({})).toBe('Unknown email');
  });

  it('should format location strings neatly based on available data tokens', () => {
    const fullLocation = { geozoneDisplayName: 'Garibaldi', facilityDisplayName: 'Elfin Lakes' };
    expect(component.getLocation(fullLocation)).toBe('Garibaldi, Elfin Lakes');

    const zoneOnly = { geozoneDisplayName: 'Garibaldi' };
    expect(component.getLocation(zoneOnly)).toBe('Garibaldi');
  });

  // TODO: expand this eventually
  it('should process human-readable labels for known activity types', () => {
    expect(component.getActivityTypeLabel('dayuse')).toBe('Day-use pass');
  });

  it('should parse epoch timestamps securely without crashing the interface', () => {
    // 1704067200000 is Jan 1, 2024
    expect(component.formatBookedDate(1704067200000)).toBe('2024-01-01');
    expect(component.formatBookedDate(0)).toBe('N/A');
  });
});


