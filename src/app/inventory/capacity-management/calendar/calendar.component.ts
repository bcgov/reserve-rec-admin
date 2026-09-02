import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

export interface InventoryPoolData {
  date: string;
  capacity: number;
  availability: number;
  available: number;
  isOpen: boolean;
  [key: string]: any;
}

export interface CapacityEditEvent {
  day: CalendarDay;
  poolData: InventoryPoolData;
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent {
  @Input() calendarDays: CalendarDay[] = [];
  @Input() inventoryPoolsByDate: Map<string, InventoryPoolData[]> = new Map();
  @Input() currentMonth: Date = new Date();
  @Input() productRangeStart: string = '';
  @Input() productRangeEnd: string = '';
  
  @Output() toggleReservation = new EventEmitter<{ day: CalendarDay; isOpen: boolean }>();
  @Output() editCapacity = new EventEmitter<CapacityEditEvent>();

  formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getInventoryPoolDataForDay(day: CalendarDay): InventoryPoolData | null {
    const key = this.formatDateKey(day.date);
    const pools = this.inventoryPoolsByDate.get(key);
    return pools && pools.length > 0 ? pools[0] : null;
  }

  onToggleReservation(day: CalendarDay) {
    const poolData = this.getInventoryPoolDataForDay(day);
    if (poolData) {
      const newState = !poolData.isOpen;
      this.toggleReservation.emit({ day, isOpen: newState });
    }
  }

  onEditCapacity(day: CalendarDay, event: Event) {
    event.stopPropagation();
    const poolData = this.getInventoryPoolDataForDay(day);
    if (poolData && poolData.isOpen) {
      this.editCapacity.emit({ day, poolData });
    }
  }

  onEditEmptyDate(day: CalendarDay, event: Event) {
    event.stopPropagation();
    const emptyPoolData: InventoryPoolData = {
      date: this.formatDateKey(day.date),
      capacity: 0,
      availability: 0,
      available: 0,
      isOpen: false
    };
    this.editCapacity.emit({ day, poolData: emptyPoolData });
  }

  onEditOutOfRangeDate(day: CalendarDay, event: Event) {
    event.stopPropagation();
    this.editCapacity.emit({ day, poolData: null });
  }

  getDayNumber(day: CalendarDay): number {
    return day.date.getDate();
  }

  getToggleStatusClass(poolData: InventoryPoolData | null): string {
    if (!poolData) return 'empty';

    const capacity = poolData.capacity || 0;
    const available = poolData.available || 0;

    if (available > 0) return 'available'; // Green: passes available
    if (capacity > 0) return 'full';       // Red: no availability (closed)
    return 'empty';                         // Grey: no capacity
  }

  isDateInProductRange(day: CalendarDay): boolean {
    if (!this.productRangeStart || !this.productRangeEnd) {
      return true;
    }
    const dateKey = this.formatDateKey(day.date);
    return dateKey >= this.productRangeStart && dateKey <= this.productRangeEnd;
  }

  hasBeenEdited(day: CalendarDay): boolean {
    const poolData = this.getInventoryPoolDataForDay(day);
    return poolData?.['manuallyEdited'] === true;
  }

  isDateInPast(day: CalendarDay): boolean {
    // Get today's date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Compare with the day's date
    return day.date < today;
  }

  isToggleDisabled(day: CalendarDay): boolean {
    // Can't toggle if date is in past
    if (this.isDateInPast(day)) {
      return true;
    }
    
    const poolData = this.getInventoryPoolDataForDay(day);
    
    // Can't toggle OFF (close) if there are bookings
    if (poolData?.isOpen && this.hasBookings(poolData)) {
      return true;
    }
    
    return false;
  }

  hasBookings(poolData: InventoryPoolData | undefined): boolean {
    if (!poolData) return false;
    // Bookings exist if available < capacity
    const booked = (poolData.capacity || 0) - (poolData.available || 0);
    return booked > 0;
  }
}

