import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Html5Qrcode } from 'html5-qrcode';
import { QrScannerComponent } from './qr-scanner.component';

jest.mock('html5-qrcode', () => ({
  Html5Qrcode: Object.assign(jest.fn(), { getCameras: jest.fn() }),
  Html5QrcodeScannerState: { SCANNING: 2 }
}));

describe('QrScannerComponent', () => {
  let component: QrScannerComponent;
  let fixture: ComponentFixture<QrScannerComponent>;
  let start: jest.Mock;

  const validUrl = 'https://admin.example.ca/verify/0f8fad5b-d9cb-469f-a165-70867728950e/0123456789abcdef';

  beforeEach(async () => {
    start = jest.fn().mockResolvedValue(undefined);
    (Html5Qrcode as unknown as jest.Mock).mockImplementation(() => {
      let state = 1;
      return {
        start: (...args: any[]) => { state = 2; return start(...args); },
        stop: jest.fn(async () => { state = 1; }),
        clear: jest.fn(),
        getState: () => state
      };
    });
    (Html5Qrcode.getCameras as jest.Mock).mockResolvedValue([{ id: 'cam1', label: 'Back camera' }]);

    await TestBed.configureTestingModule({ imports: [QrScannerComponent] }).compileComponents();
    fixture = TestBed.createComponent(QrScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('stops the camera and keeps the success state after a valid scan', async () => {
    const emitted = jest.spyOn(component.scanSuccess, 'emit');
    start.mockClear();

    component.onScanSuccess(validUrl, {} as any);
    await fixture.whenStable();

    // Camera still pointed at the same pass
    component.onScanSuccess(validUrl, {} as any);
    await fixture.whenStable();

    expect(emitted).toHaveBeenCalledTimes(1);
    expect(component.isScanSuccess).toBe(true);
    expect(start).not.toHaveBeenCalled();
  });
});
