import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { ReportsService } from '../../services/reports.service';
import { FacilityService } from '../../services/facility.service';
import { CollectionService } from '../../services/collection.service';
import { LoadingService } from '../../services/loading.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { CollectionSelectorComponent } from '../../shared/components/collection-selector/collection-selector.component';

interface DailyPassRecord {
  accountName: string;
  emailAddress: string;
  phoneNumber: string;
  streetAddress: string;
  provinceTerritory: string;
  country: string;
  postalCode: string;
  licensePlate: string;
  reservationNumber: string;
  transactionStatus: string;
  park: string;
  facility: string;
  arrivalDate: string;
  passType: string;
  vehiclePassReservedCount: number;
  vehiclePassCancelledCount: number;
  trailPassesReservedCount: number;
  trailPassesCancelledCount: number;
}

@Component({
  selector: 'app-daily-passes-report',
  imports: [CommonModule, ReactiveFormsModule, NgdsFormsModule, CollectionSelectorComponent],
  templateUrl: './daily-passes-report.component.html',
  styleUrl: './daily-passes-report.component.scss'
})
export class DailyPassesReportComponent implements OnInit, OnDestroy {
  form = this.fb.group({
    collectionId: this.fb.control('', { nonNullable: true, validators: [Validators.required], updateOn: 'blur' }),
    facilityId: [''],
    arrivalDate: ['', Validators.required]
  });

  parkOptions: { display: string; value: string }[] = [];
  facilityOptions: { display: string; value: string }[] = [];

  // Dropdown options
  collections: any[] = [];
  facilities: any[] = [];

  // State
  isLoading = false;
  facilitiesLoading = false;
  reportData: DailyPassRecord[] = [];

  constructor(
    private fb: FormBuilder,
    private reportsService: ReportsService,
    private facilityService: FacilityService,
    private collectionService: CollectionService,
    public loadingService: LoadingService,
    private toastService: ToastService,
    private loggerService: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCollections();
    // Set default date to today
    this.form.patchValue({ arrivalDate: this.formatDateForInput(new Date()) });

    this.form.get('collectionId')?.valueChanges.subscribe(() => {
      this.form.patchValue({ facilityId: '' }, { emitEvent: false });
      this.facilityOptions = [];
      this.onCollectionIdChange();
    });
  }

  async loadCollections() {
    try {
      const res = await this.collectionService.getAllCollections();
      this.collections = res?.items || [];
      this.parkOptions = this.collections.map(park => ({
        display: park.displayName,
        value: park.collectionId
      }));
    } catch (error) {
      this.loggerService.error(error);
    }
  }

  async onCollectionIdChange() {
    const collectionId = this.form.get('collectionId')?.value;
    if (!collectionId) {
      return;
    }

    try {
      this.facilitiesLoading = true;
      const res = await this.facilityService.getFacilitiesByCollectionId(collectionId);
      this.facilities = res?.items || [];
      this.facilityOptions = [
        { display: 'All facilities', value: '' },
        ...this.facilities.map(facility => ({
          display: facility.displayName,
          value: facility.facilityId
        }))
      ];
    } catch (error) {
      this.loggerService.error(error);
    } finally {
      this.facilitiesLoading = false;
    }
  }

  canExport(): boolean {
    return this.form.valid;
  }

  async exportReport() {
    if (!this.canExport()) {
      this.toastService.addMessage(
        'Please select a park and date',
        'Missing required fields',
        ToastTypes.WARNING
      );
      return;
    }

    const { collectionId, arrivalDate, facilityId } = this.form.value;

    try {
      this.isLoading = true;
      const data = await this.reportsService.getDailyPasses(
        collectionId!,
        arrivalDate!,
        facilityId || undefined
      );

      this.reportData = data || [];

      if (this.reportData.length === 0) {
        this.toastService.addMessage(
          'No data found for the selected criteria',
          'No Results',
          ToastTypes.INFO
        );
        return;
      }

      const csv = this.convertToCSV(this.reportData);
      const filename = this.generateFilename();
      this.downloadCSV(csv, filename);

      this.toastService.addMessage(
        `Exported ${this.reportData.length} records`,
        'Export Successful',
        ToastTypes.SUCCESS
      );
    } catch (error) {
      this.loggerService.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  private convertToCSV(data: DailyPassRecord[]): string {
    if (!data || data.length === 0) return '';

    const headers = [
      'Account Name',
      'Email Address',
      'Phone Number',
      'Street Address',
      'Province/Territory',
      'Country',
      'Postal Code',
      'License Plate',
      'Reservation Number',
      'Transaction Status',
      'Park',
      'Facility',
      'Arrival Date',
      'Pass Type',
      'Vehicle Pass Reserved Count',
      'Vehicle Pass Cancelled Count',
      'Trail Passes Reserved Count',
      'Trail Passes Cancelled Count'
    ];

    const rows = data.map(record => [
      this.escapeCSVField(record.accountName),
      this.escapeCSVField(record.emailAddress),
      this.escapeCSVField(record.phoneNumber),
      this.escapeCSVField(record.streetAddress),
      this.escapeCSVField(record.provinceTerritory),
      this.escapeCSVField(record.country),
      this.escapeCSVField(record.postalCode),
      this.escapeCSVField(record.licensePlate),
      this.escapeCSVField(record.reservationNumber),
      this.escapeCSVField(record.transactionStatus),
      this.escapeCSVField(record.park),
      this.escapeCSVField(record.facility),
      this.escapeCSVField(record.arrivalDate),
      this.escapeCSVField(record.passType),
      record.vehiclePassReservedCount,
      record.vehiclePassCancelledCount,
      record.trailPassesReservedCount,
      record.trailPassesCancelledCount
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private escapeCSVField(field: any): string {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // Escape fields containing commas, quotes, or newlines
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private generateFilename(): string {
    const parkName = this.getSelectedParkName();
    const dateStr = this.form.get('arrivalDate')?.value?.replace(/-/g, '') || '';
    return `daily-passes-${parkName}-${dateStr}.csv`;
  }

  private getSelectedParkName(): string {
    // Extract collectionId from collection
    const collectionId = this.form.get('collectionId')?.value || '';
    const park = this.collections.find(p => p.collection === collectionId);
    if (park) {
      return park.displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    return collectionId;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngOnDestroy(): void {
    this.cdr.detectChanges()
    this.cdr.detach()
  }
}
