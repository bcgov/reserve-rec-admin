import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CalendarComponent, CalendarDay, InventoryPoolData, CapacityEditEvent } from './calendar/calendar.component';
import { CapacityEditModalComponent } from './capacity-edit-modal/capacity-edit-modal.component';
import { SetScheduleModalComponent } from './set-schedule-modal/set-schedule-modal.component';
import { CapacityFiltersComponent } from './capacity-filters/capacity-filters.component';
import { ActivityService } from '../../services/activity.service';
import { InventoryPoolService } from '../../services/inventory-pool.service';
import { ProductService } from '../../services/product.service';
import { ProductDateService } from '../../services/product-date.service';
import { ToastService, ToastTypes } from '../../services/toast.service';

@Component({
  selector: 'app-capacity-management',
  imports: [CommonModule, BreadcrumbComponent, CapacityFiltersComponent, CalendarComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './capacity-management.component.html',
  styleUrls: ['./capacity-management.component.scss']
})
export class CapacityManagementComponent implements OnInit {
  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Inventory', link: '/inventory' },
    { label: 'Pass Capacity' },
  ];

  // Filter-related state (passed from filter component)
  filterForm!: FormGroup;
  collectionControl!: FormControl;
  productControl!: FormControl;

  // Current activity context (used for API calls)
  currentActivityType: string = '';
  currentActivityId: string = '';

  // Current product context
  currentProductName: string = '';
  currentProductRangeStart: string = '';
  currentProductRangeEnd: string = '';
  currentProduct: any = null; // Full product object for range extension

  // Calendar
  currentMonth: Date;
  calendarDays: CalendarDay[] = [];
  calendarKey: string = ''; // Used to force destroy/recreate of calendar component

  // Inventory Pools
  inventoryPoolsByDate: Map<string, InventoryPoolData[]> = new Map();

  constructor(
    protected router: Router,
    protected activityService: ActivityService,
    protected inventoryPoolService: InventoryPoolService,
    protected productService: ProductService,
    protected productDateService: ProductDateService,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private toastService: ToastService
  ) {
    // Initialize currentMonth to today's date
    this.currentMonth = new Date();
    this.initializeForm();
  }

  /**
   * Initialize a dummy form for local compatibility
   * The actual filter form is managed by CapacityFiltersComponent
   */
  private initializeForm() {
    this.filterForm = this.fb.group({
      collection: [''],
      product: ['']
    });
    this.collectionControl = this.filterForm.get('collection') as FormControl;
    this.productControl = this.filterForm.get('product') as FormControl;
  }

  ngOnInit() {
    this.generateCalendarDays();
    this.updateCalendarKey();
  }

  async onProductSelected(event: any) {
    this.collectionControl.setValue(event.collectionId, { emitEvent: false });
    this.productControl.setValue(event.productId ? `product::collection::activity::${event.productId}` : '', { emitEvent: false });
    this.currentProductName = event.productName;
    this.currentProductRangeStart = event.rangeStart;
    this.currentProductRangeEnd = event.rangeEnd;
    this.currentActivityType = event.activityType;
    this.currentActivityId = event.activityId;

    if (event.productId) {
      this.currentProduct = await this.productService.getProduct(
        event.collectionId,
        event.activityType,
        event.activityId,
        event.productId
      );
      this.generateCalendarDays();
      this.updateCalendarKey();
      await this.loadInventoryPoolData();
    } else {
      this.currentProduct = null;
      this.inventoryPoolsByDate.clear();
      this.calendarDays = [];
      this.updateCalendarKey();
    }
  }

  onCollectionChange() {
    this.inventoryPoolsByDate.clear();
    this.calendarDays = [];
    this.updateCalendarKey();
  }

  private async loadInventoryPoolData() {
    try {
      const collectionId = this.collectionControl.value;
      const productKey = this.productControl.value;
      if (!collectionId || !productKey) {
        return;
      }
      const productId = this.extractProductId(productKey);
      const year = this.currentMonth.getFullYear();
      const month = this.currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      const inventoryPoolsData = await this.inventoryPoolService.getInventoryPools(
        collectionId,
        this.currentActivityType,
        this.currentActivityId,
        productId,
        startDate,
        endDate
      );
      this.inventoryPoolsByDate.clear();
      if (inventoryPoolsData && Array.isArray(inventoryPoolsData)) {
        inventoryPoolsData.forEach((pool: any) => {
          const dateKey = pool.date;
          const capacity = pool.capacity || 0;
          const availability = pool.availability || 0;
          if (!this.inventoryPoolsByDate.has(dateKey)) {
            this.inventoryPoolsByDate.set(dateKey, []);
          }
          this.inventoryPoolsByDate.get(dateKey)!.push({
            date: dateKey,
            capacity: capacity,
            availability: availability,
            available: availability,
            isOpen: capacity === 0 && availability === 0 ? false : (pool.isOpen !== false),
            ...pool
          });
        });
      }
    } catch (error) {
      this.inventoryPoolsByDate.clear();
    }
  }

  private extractProductId(productKey: string): string {
    const parts = productKey.split('::');
    return parts[parts.length - 1];
  }

  generateCalendarDays() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const previousMonthDays: CalendarDay[] = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPreviousMonth - i);
      previousMonthDays.push({ date, isCurrentMonth: false });
    }
    const currentMonthDays: CalendarDay[] = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      currentMonthDays.push({ date, isCurrentMonth: true });
    }
    const totalCells = previousMonthDays.length + currentMonthDays.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const nextMonthDays: CalendarDay[] = [];
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      nextMonthDays.push({ date, isCurrentMonth: false });
    }
    this.calendarDays = [...previousMonthDays, ...currentMonthDays, ...nextMonthDays];
  }

  async previousMonth() {
    this.inventoryPoolsByDate.clear();
    this.calendarDays = [];
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1);
    this.generateCalendarDays();
    this.updateCalendarKey();
    await this.loadInventoryPoolData();
  }

  async nextMonth() {
    this.inventoryPoolsByDate.clear();
    this.calendarDays = [];
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1);
    this.generateCalendarDays();
    this.updateCalendarKey();
    await this.loadInventoryPoolData();
  }

  private updateCalendarKey() {
    this.calendarKey = `${this.currentMonth.getFullYear()}-${this.currentMonth.getMonth()}-${Date.now()}`;
  }

  onEditCapacity(event: CapacityEditEvent): void {
    const modalRef = this.modalService.open(CapacityEditModalComponent, { centered: true });
    modalRef.componentInstance.day = event.day;
    modalRef.componentInstance.poolData = event.poolData;
    modalRef.result.then(
      (updatedData: InventoryPoolData) => {
        this.updateSingleDay(event.day, updatedData.capacity, true, updatedData['notes']);
      },
      () => {}
    );
  }

  /**
   * Ensure ProductDate exists for a given date, creating it if necessary
   */
  private async ensureProductDateExists(collectionId: string, dateKey: string): Promise<boolean> {
    try {
      const productId = this.extractProductId(this.productControl.value);
      const productDates = await this.productDateService.getProductDates(
        collectionId,
        this.currentActivityType,
        this.currentActivityId,
        productId,
        dateKey,
        dateKey
      );

      if (!Array.isArray(productDates) || productDates.length === 0) {
        // ProductDate doesn't exist, create it
        try {
          const pdResult = await this.productService.createProductDates(
            collectionId,
            this.currentActivityType,
            this.currentActivityId,
            productId,
            { startDate: dateKey, endDate: dateKey },
            false  // Don't show success toast
          );

          if (!Array.isArray(pdResult) || pdResult.length === 0) {
            this.toastService.addMessage(
              `Date ${dateKey} could not be prepared for editing.`,
              'ProductDate Creation Failed',
              ToastTypes.ERROR
            );
            return false;
          }

        } catch (pdError: any) {
          const errorMsg = pdError?.error?.msg || pdError?.message || 'Unknown error';
          this.toastService.addMessage(
            `Date ${dateKey} could not be prepared. ${errorMsg}`,
            'ProductDate Creation Failed',
            ToastTypes.ERROR
          );
          return false;
        }
      }
      return true;
    } catch (error: any) {
      const errorMsg = error?.error?.msg || error?.message || 'Unknown error';
      this.toastService.addMessage(
        `Date ${dateKey} could not be prepared. ${errorMsg}`,
        'ProductDate Creation Failed',
        ToastTypes.ERROR
      );
      return false;
    }
  }

  /**
   * Ensure InventoryPool exists for a given date, creating it if necessary
   */
  private async ensureInventoryPoolExists(collectionId: string, productId: string, dateKey: string): Promise<InventoryPoolData[] | null> {
    try {
      const pools = await this.inventoryPoolService.getInventoryPools(
        collectionId,
        this.currentActivityType,
        this.currentActivityId,
        productId,
        dateKey,
        dateKey
      );

      if (!Array.isArray(pools) || pools.length === 0) {
        // InventoryPool doesn't exist, create it
        try {
          const createResult = await this.productService.createInventoryPools(
            collectionId,
            this.currentActivityType,
            this.currentActivityId,
            productId,
            dateKey,
            dateKey,
            false,
            false
          );

          if (!Array.isArray(createResult) || createResult.length === 0) {
            this.toastService.addMessage(
              `Date ${dateKey} could not be prepared for editing.`,
              'InventoryPool Creation Failed',
              ToastTypes.ERROR
            );
            return null;
          }

          // Use POST response data directly to update local state
          this.inventoryPoolsByDate.set(dateKey, createResult);
          return createResult;
        } catch (poolError: any) {
          const errorMsg = poolError?.error?.msg || poolError?.message || 'Unknown error';
          this.toastService.addMessage(
            `Date ${dateKey} could not be prepared. ${errorMsg}`,
            'InventoryPool Creation Failed',
            ToastTypes.ERROR
          );
          return null;
        }
      }
      return pools;
    } catch (error: any) {
      const errorMsg = error?.error?.msg || error?.message || 'Unknown error';
      this.toastService.addMessage(
        `Date ${dateKey} could not be prepared. ${errorMsg}`,
        'InventoryPool Creation Failed',
        ToastTypes.ERROR
      );
      return null;
    }
  }

  private async updateSingleDay(day: CalendarDay, capacity: number, isManualEdit: boolean = false, notes?: string): Promise<boolean> {
    try {
      const dateKey = day.date.toISOString().split('T')[0];
      const collectionId = this.collectionControl.value;
      const productId = this.extractProductId(this.productControl.value);

      if (!collectionId || !this.currentActivityType || !this.currentActivityId || !productId) {
        return false;
      }

      if (this.currentProductRangeEnd && dateKey > this.currentProductRangeEnd) {
        try {
          const currentRangeEndDate = new Date(this.currentProductRangeEnd);
          currentRangeEndDate.setDate(currentRangeEndDate.getDate() + 1);
          const startDateForProductDates = currentRangeEndDate.toISOString().split('T')[0];

          const extensionResult = await this.productService.extendProductDateRange(
            collectionId,
            this.currentActivityType,
            this.currentActivityId,
            productId,
            this.currentProduct,
            dateKey,
            startDateForProductDates
          );

          if (!extensionResult) {
            this.toastService.addMessage(
              `Could not extend date range to ${dateKey}.`,
              'Range Extension Failed',
              ToastTypes.ERROR
            );
            return false;
          }

          this.currentProduct = extensionResult.product;
          this.currentProductRangeEnd = dateKey;
        } catch (error: any) {
          const errorMsg = error?.error?.msg || error?.message || 'Unknown error';
          this.toastService.addMessage(
            `Could not extend date range to ${dateKey}. ${errorMsg}`,
            'Range Extension Failed',
            ToastTypes.ERROR
          );
          return false;
        }
      }

      const productDateExists = await this.ensureProductDateExists(collectionId, dateKey);
      if (!productDateExists) {
        return false;
      }
      const pools = await this.ensureInventoryPoolExists(collectionId, productId, dateKey);
      if (!pools) {
        return false;
      }

      // Step 4: Update capacity
      try {
        await this.inventoryPoolService.updateInventoryPool(
          collectionId,
          this.currentActivityType,
          this.currentActivityId,
          productId,
          dateKey,
          capacity,
          isManualEdit ? 'manual' : 'bulk',
          notes
        );

        const existingPool = pools[0];
        if (existingPool) {
          const oldCapacity = existingPool.capacity || 0;
          const capacityDelta = capacity - oldCapacity;
          const newAvailability = (existingPool.available || 0) + capacityDelta;
          existingPool.capacity = capacity;
          existingPool.available = Math.max(0, Math.min(newAvailability, capacity));
          existingPool['manuallyEdited'] = isManualEdit;
          if (notes) {
            existingPool['notes'] = notes;
          }
          this.inventoryPoolsByDate.set(dateKey, [...pools]);
        }
        await this.loadInventoryPoolData();

        return true;
      } catch (error: any) {
        const errorMsg = error?.error?.msg || error?.message || 'Unknown error';
        this.toastService.addMessage(
          `Date ${dateKey} could not be updated. ${errorMsg}`,
          'Capacity Update Failed',
          ToastTypes.ERROR
        );
        return false;
      }
    } catch (error: any) {
      const dateKey = day.date.toISOString().split('T')[0];
      const errorMsg = error?.error?.msg || error?.message || 'Unknown error';
      this.toastService.addMessage(
        `Date ${dateKey} could not be updated. ${errorMsg}`,
        'Capacity Update Failed',
        ToastTypes.ERROR
      );
      return false;
    }
  }

  /**
   * Open the set schedule modal
   */
  openSetScheduleModal() {
    const selectedProductId = this.productControl.value;
    if (!selectedProductId) {
      return;
    }

    const modalRef = this.modalService.open(SetScheduleModalComponent, { centered: true, size: 'lg' });
    modalRef.componentInstance.productName = this.currentProductName;
    modalRef.componentInstance.collectionId = this.collectionControl.value;
    modalRef.componentInstance.activityType = this.currentActivityType;
    modalRef.componentInstance.activityId = this.currentActivityId;
    modalRef.componentInstance.productId = this.extractProductId(selectedProductId);

    modalRef.result.then(
      (scheduleData: any) => {
        this.applySchedule(scheduleData);
      },
      () => {}
    );
  }

  private async applySchedule(scheduleData: any): Promise<void> {
    try {
      const { startDate, endDate, days, editedDates, overwriteOverrides, existingCapacityDates, overwriteExistingCapacity } = scheduleData;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const endDateString = end.toISOString().split('T')[0];
      if (this.currentProduct && endDateString > this.currentProductRangeEnd) {
        try {
          const currentRangeEndDate = new Date(this.currentProductRangeEnd);
          currentRangeEndDate.setDate(currentRangeEndDate.getDate() + 1);
          const startDateForProductDates = currentRangeEndDate.toISOString().split('T')[0];

          const extensionResult = await this.productService.extendProductDateRange(
            this.collectionControl.value,
            this.currentActivityType,
            this.currentActivityId,
            this.extractProductId(this.productControl.value),
            this.currentProduct,
            endDateString,
            startDateForProductDates
          );

          if (extensionResult) {
            this.currentProduct = extensionResult.product;
            this.currentProductRangeEnd = endDateString;
          } else {
            this.toastService.addMessage(
              'Cannot apply schedule beyond product range. Failed to extend date range.',
              'Schedule Application Failed',
              ToastTypes.ERROR
            );
            return;
          }
        } catch (extendError) {
          this.toastService.addMessage(
            'Failed to extend product date range. Schedule application cancelled.',
            'Date Range Extension Failed',
            ToastTypes.ERROR
          );
          return;
        }
      }

      await this.updateSchedule(start, end, days, editedDates, overwriteOverrides, existingCapacityDates, overwriteExistingCapacity);
    } catch (error) {
      console.error('Schedule application error:', error);
    }
  }

  private async updateSchedule(start: Date, end: Date, days: any[], editedDates: any[], overwriteOverrides: boolean = false, existingCapacityDates: any[] = [], overwriteExistingCapacity: boolean = false): Promise<void> {
    const overrideBadgeDateSet = new Set<string>(editedDates.map((ed: any) => ed.date));
    const existingCapacityDateSet = new Set<string>(existingCapacityDates.map((ed: any) => ed.date));
    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const hasOverrideBadge = overrideBadgeDateSet.has(dateKey);
      const hasExistingCapacity = existingCapacityDateSet.has(dateKey);
      const isManualOverride = hasOverrideBadge;
      const isScheduledInventory = hasExistingCapacity && !hasOverrideBadge;
      const skipDueToOverride = isManualOverride && !overwriteOverrides;
      const skipDueToScheduled = isScheduledInventory && !overwriteExistingCapacity;
      if (!skipDueToOverride && !skipDueToScheduled) {
        const dayOfWeek = current.getUTCDay();
        const dayConfig = days[dayOfWeek];
        if (dayConfig) {
          const capacity = dayConfig.passesRequired ? dayConfig.defaultCapacity : 0;
          const day: CalendarDay = { date: new Date(current), isCurrentMonth: true };
          await this.updateSingleDay(day, capacity);
        }
      }
      current.setDate(current.getDate() + 1);
    }
    await this.loadInventoryPoolData();
  }


  async toggleReservationStatus(event: { day: CalendarDay; isOpen: boolean } | CalendarDay) {
    let day: CalendarDay;
    let newState: boolean | undefined;
    if ('day' in event) {
      day = event.day;
      newState = event.isOpen;
    } else {
      day = event;
    }
    const dateKey = day.date.toISOString().split('T')[0];
    const pools = this.inventoryPoolsByDate.get(dateKey);
    if (!pools || pools.length === 0) {
      return;
    }

    const pool = pools[0];
    const finalNewState = newState !== undefined ? newState : !pool.isOpen;

    try {
      const collectionId = this.collectionControl.value;
      const productId = this.extractProductId(this.productControl.value);

      if (!collectionId || !this.currentActivityType || !this.currentActivityId || !productId) {
        return;
      }

      let newCapacity = pool.capacity;

      if (finalNewState === false) {
        const bookedPasses = (pool.capacity || 0) - (pool.available || 0);
        newCapacity = bookedPasses;
        (pool as any).originalCapacity = pool.capacity;
      } else if (finalNewState === true) {
        if ((pool as any).originalCapacity !== undefined) {
          newCapacity = (pool as any).originalCapacity;
        }
      }
      if (newCapacity !== pool.capacity) {
        try {
          const response = await this.inventoryPoolService.updateInventoryPool(
            collectionId,
            this.currentActivityType,
            this.currentActivityId,
            productId,
            dateKey,
            newCapacity
          );
          const oldCapacity = pool.capacity || 0;
          const capacityDelta = newCapacity - oldCapacity;
          const newAvailability = (pool.available || 0) + capacityDelta;
          pool.capacity = newCapacity;
          pool.available = Math.max(0, Math.min(newAvailability, newCapacity));
        } catch (updateError: any) {
          const errorMsg = updateError?.error?.msg || updateError?.message || 'Unknown error';
          this.toastService.addMessage(
            `This specific date (${dateKey}) could not be updated. ${errorMsg}. This date remains unchanged.`,
            'Capacity Update Failed',
            ToastTypes.ERROR
          );
        }
      }
      pool.isOpen = finalNewState;
    } catch (error) {
      this.toastService.addMessage(
        `Failed to toggle reservation status. Please try again.`,
        'Toggle Failed',
        ToastTypes.ERROR
      );
    }
  }

  goBack() {
    this.router.navigate(['/inventory']);
  }
}

