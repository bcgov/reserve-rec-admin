import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeResult } from 'html5-qrcode';

export interface QRScanResult {
  bookingId: string;
  hash: string;
  url: string;
}

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.scss'
})
export class QrScannerComponent implements OnInit, OnDestroy {
  @ViewChild('reader', { static: false }) readerElement?: ElementRef;
  @Output() scanSuccess = new EventEmitter<QRScanResult>();
  @Output() scanError = new EventEmitter<string>();
  @Output() closeScanner = new EventEmitter<void>();

  html5QrCode: Html5Qrcode | null = null;
  cameras: any[] = [];
  selectedCameraId: string | null = null;
  isScanning = false;
  isCameraLoading = false;
  error: string | null = null;
  lastScannedUrl: string | null = null;

  ngOnInit(): void {
    this.loadCameras();
  }

  ngOnDestroy(): void {
    this.stopScanning();
  }

  async loadCameras(): Promise<void> {
    try {
      this.isCameraLoading = true;
      this.error = null;
      
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        this.error = 'No cameras found. Please ensure camera permissions are granted.';
        return;
      }

      this.cameras = devices;
      
      // Prefer rear camera for mobile devices
      const rearCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      this.selectedCameraId = rearCamera ? rearCamera.id : devices[0].id;
      
      // Auto-start scanning with the selected camera
      await this.startScanning();
      
    } catch (error: any) {
      console.error('Error loading cameras:', error);
      this.error = `Failed to access camera: ${error.message || 'Unknown error'}. Please check camera permissions.`;
    } finally {
      this.isCameraLoading = false;
    }
  }

  async startScanning(): Promise<void> {
    if (!this.selectedCameraId) {
      this.error = 'No camera selected';
      return;
    }

    try {
      this.error = null;
      this.isScanning = true;

      // Initialize Html5Qrcode if not already done
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('reader');
      }

      // Check if already scanning
      if (this.html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
        await this.html5QrCode.stop();
      }

      await this.html5QrCode.start(
        this.selectedCameraId,
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // QR scanning box size
          aspectRatio: 1.0,
        },
        this.onScanSuccess.bind(this),
        this.onScanFailure.bind(this)
      );
      
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      this.error = `Failed to start scanner: ${error.message || 'Unknown error'}`;
      this.isScanning = false;
    }
  }

  async stopScanning(): Promise<void> {
    if (this.html5QrCode) {
      try {
        const state = this.html5QrCode.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await this.html5QrCode.stop();
        }
        this.html5QrCode.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      this.html5QrCode = null;
    }
    this.isScanning = false;
  }

  onScanSuccess(decodedText: string, decodedResult: Html5QrcodeResult): void {
    // Prevent duplicate scans
    if (decodedText === this.lastScannedUrl) {
      return;
    }

    this.lastScannedUrl = decodedText;
    
    // Parse the verification URL to extract bookingId and hash
    // Expected format: https://{domain}/verify/{bookingId}/{hash}
    const result = this.parseVerificationUrl(decodedText);
    
    if (result) {
      // Stop scanning after successful scan
      this.stopScanning();
      this.scanSuccess.emit(result);
    } else {
      this.error = 'Invalid QR code format. Expected a booking verification URL.';
      this.scanError.emit('Invalid QR code format');
    }
  }

  onScanFailure(error: any): void {
    // Scan failure is normal during scanning process, so we don't show errors
    // Only log to console for debugging
    // console.debug('Scan failure:', error);
  }

  parseVerificationUrl(url: string): QRScanResult | null {
    try {
      // Match pattern: https://{domain}/verify/{bookingId}/{hash}
      const pattern = /\/verify\/([a-f0-9-]{36})\/([a-f0-9]{16})/i;
      const match = url.match(pattern);
      
      if (match) {
        return {
          bookingId: match[1],
          hash: match[2],
          url: url
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing verification URL:', error);
      return null;
    }
  }

  async changeCamera(cameraId: string): Promise<void> {
    this.selectedCameraId = cameraId;
    this.lastScannedUrl = null; // Reset last scanned URL when changing camera
    
    if (this.isScanning) {
      await this.stopScanning();
      await this.startScanning();
    }
  }

  close(): void {
    this.stopScanning();
    this.closeScanner.emit();
  }

  resetScanner(): void {
    this.error = null;
    this.lastScannedUrl = null;
    this.loadCameras();
  }
}
