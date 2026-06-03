import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { QrScannerComponent, QRScanResult } from '../../shared/components/qr-scanner/qr-scanner.component';

@Component({
  selector: 'app-qr-scanner-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QrScannerComponent],
  templateUrl: './qr-scanner-page.component.html',
  styleUrl: './qr-scanner-page.component.scss'
})
export class QrScannerPageComponent {
  isLoading = false;
  
  showQRScanner = false;
  qrVerificationResult: any = null;
  showVerificationResult = false;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private loggerService: LoggerService
  ) {

  }

  // Utility methods for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
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
    this.qrVerificationResult = null;
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

      this.qrVerificationResult = verificationResponse['data'];
      this.showVerificationResult = true;

      this.toastService.addMessage(
        'QR code scanned successfully',
        'Success',
        ToastTypes.SUCCESS
      );
    } catch (error: any) {
      this.handleError('Failed to verify QR code', error);
      this.toastService.addMessage(
        error?.message || 'QR code verification failed',
        'Verification Error',
        ToastTypes.ERROR
      );
    } finally {
      this.isLoading = false;
    }
  }

  onQRScanError(error: string) {
    this.toastService.addMessage(
      error,
      'Scan Error',
      ToastTypes.WARNING
    );
  }

  closeVerificationResult() {
    this.showVerificationResult = false;
    this.qrVerificationResult = null;
  }

  getVerificationStatus(): 'valid' | 'invalid' | 'expired' | 'cancelled' {
    if (!this.qrVerificationResult) return 'invalid';

    const verification = this.qrVerificationResult.verification;
    if (verification?.isCancelled) return 'cancelled';
    if (verification?.isExpired) return 'expired';
    if (verification?.isConfirmed && this.qrVerificationResult.isValid) return 'valid';

    return 'invalid';
  }

  getStatusIcon(): string {
    const status = this.getVerificationStatus();
    switch (status) {
      case 'valid': return 'fa-circle-check';
      case 'expired': return 'fa-clock';
      case 'cancelled': return 'fa-ban';
      default: return 'fa-exclamation-triangle';
    }
  }

  getStatusClass(): string {
    const status = this.getVerificationStatus();
    switch (status) {
      case 'valid': return 'alert-success';
      case 'expired': return 'alert-warning';
      case 'cancelled': return 'alert-danger';
      default: return 'alert-danger';
    }
  }

  getStatusMessage(): string {
    const status = this.getVerificationStatus();
    switch (status) {
      case 'valid': return 'This booking is valid and confirmed';
      case 'expired': return 'This booking has expired';
      case 'cancelled': return 'This booking has been cancelled';
      default: return 'This booking is not valid';
    }
  }
}
