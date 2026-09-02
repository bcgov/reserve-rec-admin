import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InventoryPoolData, CalendarDay } from '../calendar/calendar.component';

@Component({
  selector: 'app-capacity-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './capacity-edit-modal.component.html',
  styleUrls: ['./capacity-edit-modal.component.scss']
})
export class CapacityEditModalComponent implements OnInit {
  @Input() day: CalendarDay;
  @Input() poolData: InventoryPoolData;

  form: FormGroup;
  originalPoolData: InventoryPoolData;
  formattedDate: string;
  capacityDelta: number = 0;
  calculatedAvailability: number = 0;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    if (!this.poolData) {
      this.poolData = {
        date: this.day.date.toISOString().split('T')[0],
        capacity: 0,
        availability: 0,
        available: 0,
        isOpen: false
      };
    }

    this.originalPoolData = { ...this.poolData };
    this.formattedDate = new Date(this.day.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.form = this.fb.group({
      capacity: [this.poolData.capacity.toString(), [Validators.required, Validators.min(0)]],
      notes: [this.poolData['notes'] || '']
    });

    this.form.get('capacity')?.valueChanges.subscribe(() => this.updateCalculatedValues());
    this.updateCalculatedValues();
  }

  updateCalculatedValues(): void {
    const newCapacity = this.parseCapacity(this.form.value.capacity);
    this.capacityDelta = newCapacity - this.originalPoolData.capacity;
    this.calculatedAvailability = (this.originalPoolData.available || 0) + this.capacityDelta;
    this.calculatedAvailability = Math.max(0, Math.min(this.calculatedAvailability, newCapacity));
  }

  isCapacityValid(): boolean {
    const newCapacity = this.parseCapacity(this.form.value.capacity);
    // Capacity cannot be reduced below the booked amount
    const booked = (this.originalPoolData.capacity || 0) - (this.originalPoolData.available || 0);
    return newCapacity >= booked;
  }

  getCapacityErrorMessage(): string {
    if (!this.isCapacityValid()) {
      const booked = (this.originalPoolData.capacity || 0) - (this.originalPoolData.available || 0);
      return `Capacity cannot be less than ${booked} (currently booked passes). Please increase capacity or cancel bookings.`;
    }
    return '';
  }

  onNumericInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const numericValue = input.value.replace(/[^0-9]/g, '');
    if (input.value !== numericValue) {
      input.value = numericValue;
    }
    this.form.get(fieldName)?.setValue(numericValue, { emitEvent: true });
  }

  save(): void {
    if (this.form.valid) {
      this.activeModal.close({
        ...this.poolData,
        capacity: this.parseCapacity(this.form.value.capacity),
        notes: this.form.value.notes || ''
      });
    }
  }

  private parseCapacity(value: string | number): number {
    return parseInt(String(value || '0'), 10);
  }
}