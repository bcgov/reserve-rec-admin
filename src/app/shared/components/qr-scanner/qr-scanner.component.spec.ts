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
        // like html5-qrcode, state only becomes SCANNING once the camera is up
        start: async (...args: any[]) => { await start(...args); state = 2; },
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

  it('restarts the camera and clears the success state on reset', async () => {
    component.onScanSuccess(validUrl, {} as any);
    await fixture.whenStable();
    start.mockClear();

    await component.resetScanner();
    fixture.detectChanges();

    expect(start).toHaveBeenCalledTimes(1);
    expect(component.isScanSuccess).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Pass scanned successfully.');
  });

  it('keeps the restarted camera when reset runs before the post-scan stop finishes', async () => {
    let finishStop!: () => void;
    const stop = component.html5QrCode!.stop as jest.Mock;
    stop.mockImplementationOnce(() => new Promise<void>(r => { finishStop = r; }));

    component.onScanSuccess(validUrl, {} as any);
    start.mockClear();
    const reset = component.resetScanner(); // verify failed before the camera finished stopping
    await new Promise(r => setTimeout(r)); // restart gets going
    finishStop();
    await reset;
    await fixture.whenStable();

    expect(start).toHaveBeenCalledTimes(1);
    expect(component.html5QrCode).not.toBeNull();
  });

  it('ignores the same failed pass for a few seconds after reset, then scans it again', async () => {
    const emitted = jest.spyOn(component.scanSuccess, 'emit');
    component.onScanSuccess(validUrl, {} as any);
    await fixture.whenStable();
    jest.useFakeTimers();
    try {
      await component.resetScanner();

      component.onScanSuccess(validUrl, {} as any); // pass still held in front of the camera
      expect(emitted).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(3000);
      component.onScanSuccess(validUrl, {} as any);
      expect(emitted).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('ignores a second pass decoded while the first is being verified', async () => {
    const emitted = jest.spyOn(component.scanSuccess, 'emit');
    const stop = component.html5QrCode!.stop as jest.Mock;

    component.onScanSuccess(validUrl, {} as any);
    component.onScanSuccess(validUrl.replace('0123456789abcdef', 'fedcba9876543210'), {} as any); // late frame
    await fixture.whenStable();

    expect(emitted).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops a camera that finishes starting after the scanner is destroyed', async () => {
    let finishStart!: () => void;
    start.mockImplementationOnce(() => new Promise<void>(r => { finishStart = r; }));
    component.onScanSuccess(validUrl, {} as any);
    await fixture.whenStable();

    const reset = component.resetScanner();
    await new Promise(r => setTimeout(r)); // camera start is pending
    const qr = component.html5QrCode!;
    fixture.destroy(); // staff left the page
    finishStart();
    await reset;

    expect(qr.stop).toHaveBeenCalled();
  });

  it('does not restart the camera on reset after the scanner is destroyed', async () => {
    component.onScanSuccess(validUrl, {} as any);
    await fixture.whenStable();
    start.mockClear();

    fixture.destroy(); // staff left the page while verify was in flight
    await component.resetScanner();

    expect(start).not.toHaveBeenCalled();
  });

  it('does not restart the camera on reset when no pass was scanned', async () => {
    start.mockClear();

    await component.resetScanner();

    expect(start).not.toHaveBeenCalled();
  });

  it('shows a verifying spinner while verifying, in a status region that stays rendered', () => {
    const region = fixture.nativeElement.querySelector('[role="status"]');
    expect(region).not.toBeNull(); // live region must exist before its text changes

    fixture.componentRef.setInput('verifying', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Verifying pass');

    fixture.componentRef.setInput('verifying', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeNull();
  });
});
