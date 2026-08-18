import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { InventoryPoolService } from '../../../services/inventory-pool.service';

interface DayCapacity {
  day: string;
  index: number;
  passesRequired: boolean;
  defaultCapacity: number;
}

interface EditedDate {
  date: string;
  capacity: number;
  lastUpdated: string;
}

@Component({
  selector: 'app-set-schedule-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgdsFormsModule],
  templateUrl: './set-schedule-modal.component.html',
  styleUrls: ['./set-schedule-modal.component.scss']
})
export class SetScheduleModalComponent implements OnInit {
  @Input() productName: string = '';
  @Input() collectionId: string = '';
  @Input() activityType: string = '';
  @Input() activityId: string = '';
  @Input() productId: string = '';

  form!: FormGroup;
  days: DayCapacity[] = [];
  addAnotherSchedule: boolean = false;
  overwriteOverrides: boolean = false;
  overwriteExistingCapacity: boolean = false;
  
  // Dates with override badges (locked from bulk operations)
  editedDates: EditedDate[] = [];
  
  // Dates with existing capacity assigned
  existingCapacityDates: EditedDate[] = [];

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private inventoryPoolService: InventoryPoolService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeDays();
    this.form.get('startDate')?.valueChanges.subscribe(() => this.checkForConflicts());
    this.form.get('endDate')?.valueChanges.subscribe(() => this.checkForConflicts());
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    });
  }

  private initializeDays(): void {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.days = dayNames.map((day, index) => ({
      day,
      index,
      passesRequired: false,
      defaultCapacity: 0
    }));
  }

  private parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  togglePassesRequired(day: DayCapacity): void {
    day.passesRequired = !day.passesRequired;
    if (!day.passesRequired) {
      day.defaultCapacity = 0;
    }
  }

  onCapacityInput(event: Event, day: DayCapacity): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      day.defaultCapacity = numValue;
    } else if (value === '') {
      day.defaultCapacity = 0;
    }
  }

  getActiveDaysCount(): number {
    return this.days.filter(day => day.passesRequired).length;
  }

  isValidDateRange(): boolean {
    const start = this.form.get('startDate')?.value;
    const end = this.form.get('endDate')?.value;
    if (!start || !end) {
      return false;
    }
    const startDate = this.parseDate(start);
    const endDate = this.parseDate(end);
    return endDate >= startDate;
  }

  private async checkForConflicts(): Promise<void> {
    if (!this.isValidDateRange()) {
      this.editedDates = [];
      this.existingCapacityDates = [];
      return;
    }
    const startVal = this.form.get('startDate')?.value;
    const endVal = this.form.get('endDate')?.value;
    try {
      const inventoryPoolsData = await this.inventoryPoolService.getInventoryPools(
        this.collectionId,
        this.activityType,
        this.activityId,
        this.productId,
        startVal,
        endVal
      );
      if (!inventoryPoolsData || !Array.isArray(inventoryPoolsData)) {
        this.editedDates = [];
        this.existingCapacityDates = [];
        return;
      }
      this.editedDates = inventoryPoolsData
        .filter((pool: any) => pool.manuallyEdited === true)
        .map((pool: any) => ({
          date: pool.date,
          capacity: pool.capacity || 0,
          lastUpdated: pool.lastUpdated
        }));
      const dateCapacityMap = new Map<string, number>();
      inventoryPoolsData.forEach((pool: any) => {
        const existingCapacity = dateCapacityMap.get(pool.date) || 0;
        dateCapacityMap.set(pool.date, Math.max(existingCapacity, pool.capacity || 0));
      });
      this.existingCapacityDates = Array.from(dateCapacityMap.entries())
        .filter(([date, capacity]) => capacity > 0)
        .map(([date, capacity]) => ({
          date,
          capacity,
          lastUpdated: ''
        }));
    } catch (error) {
      this.editedDates = [];
      this.existingCapacityDates = [];
    }
  }

  getScheduleData(): any {
    return {
      startDate: this.form.get('startDate')?.value,
      endDate: this.form.get('endDate')?.value,
      days: this.days,
      editedDates: this.editedDates,
      overwriteOverrides: this.overwriteOverrides,
      existingCapacityDates: this.existingCapacityDates,
      overwriteExistingCapacity: this.overwriteExistingCapacity
    };
  }

  onSave(): void {
    if (!this.isValidDateRange()) {
      return;
    }
    const scheduleData = this.getScheduleData();
    if (this.addAnotherSchedule) {
      this.form.reset();
      this.initializeDays();
      this.addAnotherSchedule = false;
      this.overwriteOverrides = false;
      this.overwriteExistingCapacity = false;
      this.editedDates = [];
      this.existingCapacityDates = [];
    } else {
      this.activeModal.close(scheduleData);
    }
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }
}
