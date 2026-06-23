import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { QrScannerPageComponent } from './qr-scanner-page.component';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { QrScannerComponent } from '../../shared/components/qr-scanner/qr-scanner.component';
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  template: '<div>Mock Scanner</div>'
})
class MockQrScannerComponent {
  @Output() scanSuccess = new EventEmitter<any>();
  @Output() scanError = new EventEmitter<any>();
  @Output() closeScanner = new EventEmitter<any>();
}

describe('QrScannerPageComponent', () => {
  let component: QrScannerPageComponent;
  let fixture: ComponentFixture<QrScannerPageComponent>;

  let mockApiService: any;
  let mockToastService: any;
  let mockLoggerService: any;

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

  beforeEach(() => {
    mockApiService = {
      get: createMockFn((path: string, options: any) => of({ data: { bookingId: '123', status: 'confirmed' } }))
    };

    mockToastService = {
      addMessage: createMockFn((msg: string, title: string, type: string) => { })
    };

    mockLoggerService = {
      error: createMockFn((err: any) => { })
    };
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrScannerPageComponent, FormsModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ToastService, useValue: mockToastService },
        { provide: LoggerService, useValue: mockLoggerService }
      ]
    })
    .overrideComponent(QrScannerPageComponent, {
      remove: { imports: [QrScannerComponent] },
      add: { imports: [MockQrScannerComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrScannerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close scanner', () => {
    component.openQRScanner();
    expect(component.showQRScanner).toBe(true);
    component.closeQRScanner();
    expect(component.showQRScanner).toBe(false);
  });

  it('should handle successful QR scan', async () => {
    const apiSpy = mockApiService.get;
    const mockResult = { bookingId: '123', hash: 'abc', url: 'test-url' };

    await component.onQRScanSuccess(mockResult);

    expect(apiSpy).toHaveBeenCalledWith('verify/123/abc', {});
    expect(component.qrBookingResult.bookingId).toBe('123');
    expect(component.showVerificationResult).toBe(true);
    expect(component.showQRScanner).toBe(false);
  });

  it('should handle QR scan failure', async () => {
    const error = { message: 'Error' };
    setMockReturnValue(mockApiService.get, throwError(() => error));
    const toastSpy = mockToastService.addMessage;

    await component.onQRScanSuccess({ bookingId: '123', hash: 'abc', url: 'test-url' });

    expect(toastSpy).toHaveBeenCalledWith('Error', 'QR code verification failed', ToastTypes.ERROR);
    expect(component.isLoading).toBe(false);
  });
});


