import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { QrScannerComponent, QRScanResult } from '../../shared/components/qr-scanner/qr-scanner.component';
import { PassDetailsComponent } from '../pass-details/pass-details.component';

@Component({
  selector: 'app-qr-scanner-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScannerComponent, PassDetailsComponent],
  templateUrl: './qr-scanner-page.component.html',
  styleUrl: './qr-scanner-page.component.scss'
})
export class QrScannerPageComponent implements OnInit {
  isLoading = false;
  
  showQRScanner = false;
  qrBookingResult: any = null;
  showVerificationResult = false;

  // Sandbox testing tools
  isSandboxMode = false;
  manualBookingId = '';

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private loggerService: LoggerService
  ) {}

  ngOnInit(): void {
    // Check if we are in a development/sandbox environment
    const env = (window as any).__env?.ENVIRONMENT;
    this.isSandboxMode = env === 'sandbox' || env === 'local' || env === 'dev';
  }

  private handleError(message: string, error: any) {
    this.loggerService.error(error);
    this.toastService.addMessage(
      error?.message || 'An unexpected error occurred',
      message,
      ToastTypes.ERROR
    );
  }

  // QR Code Scanner Methods
  openQRScanner() {
    this.showQRScanner = true;
    this.qrBookingResult = null;
    this.showVerificationResult = false;
  }

  closeQRScanner() {
    this.showQRScanner = false;
  }

  async onQRScanSuccess(result: QRScanResult) {
    try {
      this.isLoading = true;
      this.closeQRScanner();

      // Call the verification endpoint
      const verificationResponse = await lastValueFrom(
        this.apiService.get(`verify/${result.bookingId}/${result.hash}`, {})
      );

      this.qrBookingResult = verificationResponse['data'];
      this.showVerificationResult = true;

    } catch (error: any) {
      this.loggerService.error(error);
      const errorMessage = 
        (error as any)?.error?.msg ||
        (error as any)?.error?.error ||
        (error as any)?.error?.message ||
        (error as any)?.message ||
        'Unknown error';
      this.toastService.addMessage(
        errorMessage,
        `QR code verification failed`,
        ToastTypes.ERROR
      );
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  onQRScanError(error: string) {
    this.toastService.addMessage(
      error,
      'Scan Error',
      ToastTypes.ERROR
    );
  }

  async verifyManualBooking() {
    if (!this.manualBookingId) {
      this.toastService.addMessage('Please enter a booking ID', 'Input Required', ToastTypes.WARNING);
      return;
    }

    // Trigger verification using the sandbox bypass hash
    const result: QRScanResult = {
      bookingId: this.manualBookingId.trim(),
      hash: 'SANDBOX-BYPASS-01',
      url: 'manual-entry'
    };

    await this.onQRScanSuccess(result);
  }

  closeVerificationResult() {
    this.showVerificationResult = false;
    this.qrBookingResult = null;
    this.showQRScanner = true; // Go back to scanner
  }
}
