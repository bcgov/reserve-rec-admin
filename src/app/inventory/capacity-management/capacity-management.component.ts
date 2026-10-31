import { Component, OnInit, ViewChild, signal } from '@angular/core';
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
    { label: 'Pass capacity' },
  ];

  // track component loading
  private loadingIds = signal<Set<string>>(new Set());
  loading$ = (() => this.loadingIds().size > 0);

  // Reference to child filters component
  @ViewChild(CapacityFiltersComponent) filtersComponent!: CapacityFiltersComponent;

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


  private addLoadingId(id: string) {
    this.loadingIds.update(ids => new Set([...ids, id]));
    this.updateFormControlsState();
  }

  private removeLoadingId(id: string) {
    this.loadingIds.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(id);
      return newIds;
    });
    this.updateFormControlsState();
    // Notify child component to update its filter states when external loading completes
    if (this.filtersComponent) {
      this.filtersComponent.updateFilterStates(this.loading$());
    }
  }

  /**
   * Disable/enable form controls based on loading state
   */
  private updateFormControlsState() {
    const isLoading = this.loading$();
    if (isLoading) {
      this.collectionControl.disable({ emitEvent: false });
      this.productControl.disable({ emitEvent: false });
    } else {
      this.collectionControl.enable({ emitEvent: false });
      this.productControl.enable({ emitEvent: false });
    }
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
      await this.loadInventoryPoolData(false); // If your changing products clear the override badge
    } else {
      this.currentProduct = null;
      this.inventoryPoolsByDate.clear();
      this.calendarDays = [];
      this.updateCalendarKey();
    }
  }

  onCollectionChange() {
    // Clear product context
    this.productControl.setValue('', { emitEvent: false });
    this.currentProductName = '';
    this.currentProductRangeStart = '';
    this.currentProductRangeEnd = '';
    this.currentProduct = null;
    this.currentActivityType = '';
    this.currentActivityId = '';
    
    // Clear calendar
    this.inventoryPoolsByDate.clear();
    this.calendarDays = [];
    this.updateCalendarKey();
  }

  onFacilityChange() {
    // Clear product context
    this.productControl.setValue('', { emitEvent: false });
    this.currentProductName = '';
    this.currentProductRangeStart = '';
    this.currentProductRangeEnd = '';
    this.currentProduct = null;
    this.currentActivityType = '';
    this.currentActivityId = '';
    
    // Clear calendar
    this.inventoryPoolsByDate.clear();
    this.calendarDays = [];
    this.updateCalendarKey();
  }

  onFiltersLoadingStateChanged(isLoading: boolean) {
    if (isLoading) {
      this.addLoadingId('filters-loading');
    } else {
      this.removeLoadingId('filters-loading');
    }
  }

  private async loadInventoryPoolData(preserveManualEdits: boolean = true) {
    const requestId = 'load-inventory-pools';
    this.addLoadingId(requestId);
    try {
      const collectionId = this.collectionControl.value;
      const productKey = this.productControl.value;
      if (!collectionId || !productKey) {
        return;
      }
      
      // Preserve manuallyEdited flags before reload (only if requested, e.g., for month navigation)
      const preservedManuallyEdited = new Map<string, boolean>();
      if (preserveManualEdits) {
        this.inventoryPoolsByDate.forEach((pools, dateKey) => {
          if (pools[0]?.['manuallyEdited'] === true) {
            preservedManuallyEdited.set(dateKey, true);
          }
        });
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
        endDate,
        undefined,
        true // include the checked-in tally (#391)
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
          const poolData = {
            date: dateKey,
            capacity: capacity,
            availability: availability,
            available: availability,
            isOpen: pool.isOpen !== false,
            ...pool
          };
          // Restore manuallyEdited flag if it was set before reload
          if (preservedManuallyEdited.has(dateKey)) {
            poolData['manuallyEdited'] = true;
          }
          this.inventoryPoolsByDate.get(dateKey)!.push(poolData);
        });
      }
    } catch (error) {
      this.inventoryPoolsByDate.clear();
    } finally {
      this.removeLoadingId(requestId);
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
      async (updatedData: InventoryPoolData) => {
        const requestId = 'edit-capacity';
        this.addLoadingId(requestId);
        try {
          await this.updateSingleDay(event.day, updatedData.capacity, true, updatedData['notes']);
        } finally {
          this.removeLoadingId(requestId);
        }
      },
      () => {}
    );
  }

  // Inline passes edit from the mobile day panel (#463); same save as the edit modal
  onSaveCapacity(event: { day: CalendarDay; capacity: number }): Promise<boolean> {
    return this.updateSingleDay(event.day, event.capacity, true);
  }

  /**
   * Ensure ProductDate exists for a given date, creating it if necessary
   */
  private async ensureProductDateExists(collectionId: string, dateKey: string, activityType?: string, activityId?: string, productId?: string): Promise<boolean> {
    try {
      const finalActivityType = activityType || this.currentActivityType;
      const finalActivityId = activityId || this.currentActivityId;
      const finalProductId = productId || this.extractProductId(this.productControl.value);
      
      const productDates = await this.productDateService.getProductDates(
        collectionId,
        finalActivityType,
        finalActivityId,
        finalProductId,
        dateKey,
        dateKey
      );

      if (!Array.isArray(productDates) || productDates.length === 0) {
        // ProductDate doesn't exist, create it
        try {
          const pdResult = await this.productService.createProductDates(
            collectionId,
            finalActivityType,
            finalActivityId,
            finalProductId,
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
  private async ensureInventoryPoolExists(collectionId: string, productId: string, dateKey: string, activityType?: string, activityId?: string): Promise<InventoryPoolData[] | null> {
    try {
      const finalActivityType = activityType || this.currentActivityType;
      const finalActivityId = activityId || this.currentActivityId;
      
      const pools = await this.inventoryPoolService.getInventoryPools(
        collectionId,
        finalActivityType,
        finalActivityId,
        productId,
        dateKey,
        dateKey
      );

      if (!Array.isArray(pools) || pools.length === 0) {
        // InventoryPool doesn't exist, create it
        try {
          const createResult = await this.productService.createInventoryPools(
            collectionId,
            finalActivityType,
            finalActivityId,
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

  private async updateSingleDay(day: CalendarDay, capacity: number, isManualEdit: boolean = false, notes?: string, clearManualEdit: boolean = false, capturedCollectionId?: string, capturedActivityType?: string, capturedActivityId?: string, capturedProductId?: string): Promise<boolean> {
    const requestId = 'update-single-day';
    this.addLoadingId(requestId);
    try {
      const dateKey = day.date.toISOString().split('T')[0];
      const collectionId = capturedCollectionId || this.collectionControl.value;
      const activityType = capturedActivityType || this.currentActivityType;
      const activityId = capturedActivityId || this.currentActivityId;
      const productId = capturedProductId || this.extractProductId(this.productControl.value);

      if (!collectionId || !activityType || !activityId || !productId) {
        return false;
      }

      if (this.currentProductRangeEnd && dateKey > this.currentProductRangeEnd) {
        try {
          const currentRangeEndDate = new Date(this.currentProductRangeEnd);
          currentRangeEndDate.setDate(currentRangeEndDate.getDate() + 1);
          const startDateForProductDates = currentRangeEndDate.toISOString().split('T')[0];

          const extensionResult = await this.productService.extendProductDateRange(
            collectionId,
            activityType,
            activityId,
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

      const productDateExists = await this.ensureProductDateExists(collectionId, dateKey, activityType, activityId, productId);
      if (!productDateExists) {
        return false;
      }
      const pools = await this.ensureInventoryPoolExists(collectionId, productId, dateKey, activityType, activityId);
      if (!pools) {
        return false;
      }

      // Step 4: Update capacity
      try {
        const existingPool = pools[0];
        const oldCapacity = existingPool?.capacity || 0;
        const response = await this.inventoryPoolService.updateInventoryPool(
          collectionId,
          activityType,
          activityId,
          productId,
          dateKey,
          capacity,
          isManualEdit ? 'manual' : 'bulk',
          notes,
          isManualEdit ? oldCapacity : undefined,
          clearManualEdit
        );

        if (existingPool) {
          const capacityDelta = capacity - oldCapacity;
          const newAvailability = (existingPool.available || 0) + capacityDelta;
          existingPool.capacity = capacity;
          existingPool.available = Math.max(0, Math.min(newAvailability, capacity));
          // Only mark give override badge for manual edits (not for toggles or bulk updates)
          if (isManualEdit) {
            existingPool['manuallyEdited'] = true;
          }
          // Clear manual edit flag if requested (e.g., when applying schedule that overwrites overrides)
          if (clearManualEdit) {
            existingPool['manuallyEdited'] = false;
          }
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
    } finally {
      this.removeLoadingId(requestId);
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

    const modalRef = this.modalService.open(SetScheduleModalComponent, { centered: true, size: 'lg', fullscreen: 'md', ariaLabelledBy: 'set-schedule-title' });
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
    const requestId = 'apply-schedule';
    this.addLoadingId(requestId);
    
    // Capture context once at the start to prevent changes during processing
    const capturedCollectionId = this.collectionControl.value;
    const capturedActivityType = this.currentActivityType;
    const capturedActivityId = this.currentActivityId;
    const capturedProductId = this.extractProductId(this.productControl.value);
    
    try {
      const { startDate, endDate, days, editedDates, overwriteOverrides, existingCapacityDates, allExistingCapacityDates, overwriteExistingCapacity } = scheduleData;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const endDateString = end.toISOString().split('T')[0];
      if (this.currentProduct && endDateString > this.currentProductRangeEnd) {
        try {
          const currentRangeEndDate = new Date(this.currentProductRangeEnd);
          currentRangeEndDate.setDate(currentRangeEndDate.getDate() + 1);
          const startDateForProductDates = currentRangeEndDate.toISOString().split('T')[0];

          const extensionResult = await this.productService.extendProductDateRange(
            capturedCollectionId,
            capturedActivityType,
            capturedActivityId,
            capturedProductId,
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

      await this.updateSchedule(start, end, days, editedDates, overwriteOverrides, allExistingCapacityDates, overwriteExistingCapacity, capturedCollectionId, capturedActivityType, capturedActivityId, capturedProductId);
    } catch (error) {
      console.error('Schedule application error:', error);
    } finally {
      this.removeLoadingId(requestId);
    }
  }

  private async updateSchedule(start: Date, end: Date, days: any[], editedDates: any[], overwriteOverrides: boolean = false, existingCapacityDates: any[] = [], overwriteExistingCapacity: boolean = false, collectionId: string, activityType: string, activityId: string, productId: string): Promise<void> {
    const requestId = 'update-schedule';
    this.addLoadingId(requestId);
    try {
      const overrideBadgeDateSet = new Set<string>(editedDates.map((ed: any) => ed.date));
      const existingCapacityDateSet = new Set<string>(existingCapacityDates.map((ed: any) => ed.date));
      // Passes already booked per date, so turning a day off winds it down to
      // what is booked instead of wiping capacity out from under those passes.
      const bookedByDate = new Map<string, number>(
        existingCapacityDates.map((ed: any) => [ed.date, ed.booked || 0])
      );
      
      // Fetch inventory pools for the entire schedule range upfront
      // so we can properly toggle dates outside the visible month
      // DONT USE SAME MAP AS CALENDAR! 
      const scheduleRangePoolsMap = new Map<string, any[]>();
      const scheduleStartStr = start.toISOString().split('T')[0];
      const scheduleEndStr = end.toISOString().split('T')[0];
      try {
        const scheduleRangePools = await this.inventoryPoolService.getInventoryPools(
          collectionId,
          activityType,
          activityId,
          productId,
          scheduleStartStr,
          scheduleEndStr,
          undefined,
          true // include checked-in tally
        );
        
        // Treat null as a failure (getInventoryPools catches errors and returns null)
        if (!scheduleRangePools) {
          throw new Error('Failed to fetch schedule range pools');
        }
        
        // Store schedule range pools in a separate map
        if (Array.isArray(scheduleRangePools)) {
          scheduleRangePools.forEach((pool: any) => {
            const dateKey = pool.date;
            if (!scheduleRangePoolsMap.has(dateKey)) {
              scheduleRangePoolsMap.set(dateKey, []);
            }
            const poolData = {
              date: dateKey,
              capacity: pool.capacity || 0,
              availability: pool.availability || 0,
              available: pool.availability || 0,
              isOpen: pool.isOpen !== false,
              ...pool
            };
            scheduleRangePoolsMap.get(dateKey)!.push(poolData);
          });
        }
      } catch (fetchError) {
        this.toastService.addMessage(
          `Failed to fetch schedule range pools: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}. Schedule application cancelled.`,
          'Schedule Error',
          ToastTypes.ERROR
        );
        // Cannot continue safely - dates outside the visible month cannot be processed
        throw new Error('Failed to fetch schedule range pools');
      }
      
      // Get today's date string for comparison (YYYY-MM-DD format)
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      
      const current = new Date(start);
      while (current <= end) {
        const dateKey = current.toISOString().split('T')[0];
        
        // Skip dates before today (but allow today)
        if (dateKey < todayKey) {
          current.setDate(current.getDate() + 1);
          continue;
        }
        
        const hasOverrideBadge = overrideBadgeDateSet.has(dateKey);
        const hasExistingCapacity = existingCapacityDateSet.has(dateKey);
        const isManualOverride = hasOverrideBadge;
        const isScheduledInventory = hasExistingCapacity && !hasOverrideBadge;
        const skipDueToOverride = isManualOverride && !overwriteOverrides;
        const skipDueToScheduled = isScheduledInventory && !overwriteExistingCapacity;
        if (!skipDueToOverride && !skipDueToScheduled) {
          const dayOfWeek = current.getUTCDay();
          const dayConfig = days[dayOfWeek];
          const day: CalendarDay = { date: new Date(current), isCurrentMonth: true };
          // If overwriting a manual override, clear the manual edit flag
          const clearManualEdit = hasOverrideBadge && overwriteOverrides;
          
          if (dayConfig?.passesRequired) {
            // Ensure the date is open, then set capacity
            const poolsForDay = scheduleRangePoolsMap.get(dateKey);
            if (poolsForDay && poolsForDay[0] && !poolsForDay[0].isOpen) {
              // Pass both the pool data and the new capacity to do it all in one write
              await this.toggleReservationStatus({ day, isOpen: true, pool: poolsForDay, newCapacity: dayConfig.defaultCapacity }, undefined, collectionId, activityType, activityId, productId);
            } else {
              // Day is already open, just update capacity
              await this.updateSingleDay(day, dayConfig.defaultCapacity, false, undefined, clearManualEdit, collectionId, activityType, activityId, productId);
            }
          } else if (hasExistingCapacity) {
            // Unchecked day that already carries capacity from an earlier schedule:
            // If it's currently open, toggle it closed (which handles capacity and preCloseCapacity).
            // If it's already closed, just update capacity to booked amount.
            // Check schedule range pools first, then fall back to visible month pools
            const poolsForDay = scheduleRangePoolsMap.get(dateKey);
            if (poolsForDay && poolsForDay[0] && poolsForDay[0].isOpen) {
              // Pass the fetched pool data to toggleReservationStatus
              await this.toggleReservationStatus({ day, isOpen: false, pool: poolsForDay }, undefined, collectionId, activityType, activityId, productId);
            } else if (!poolsForDay || !poolsForDay[0]) {
              // No data in schedule range map - try to fetch or use cached data
              // toggleReservationStatus will handle the fallback
              await this.toggleReservationStatus({ day, isOpen: false }, undefined, collectionId, activityType, activityId, productId);
            } else {
              // edge case to handle a day that is already closed but has existing capacity.
              await this.updateSingleDay(day, bookedByDate.get(dateKey) || 0, false, undefined, clearManualEdit, collectionId, activityType, activityId, productId);
            }
          }
        }
        current.setDate(current.getDate() + 1);
      }
      await this.loadInventoryPoolData();
    } finally {
      this.removeLoadingId(requestId);
    }
  }


  async toggleReservationStatus(event: { day: CalendarDay; isOpen: boolean; pool?: any[]; newCapacity?: number } | CalendarDay, providedPool?: any, capturedCollectionId?: string, capturedActivityType?: string, capturedActivityId?: string, capturedProductId?: string) {
    let day: CalendarDay;
    let newState: boolean | undefined;
    let poolData: any[] | undefined;
    let newCapacityOverride: number | undefined;
    
    if ('day' in event) {
      day = event.day;
      newState = event.isOpen;
      poolData = event.pool; // Optional pool data passed from schedule operation
      newCapacityOverride = event.newCapacity; // Optional capacity to set when opening
    } else {
      day = event;
    }
    
    const dateKey = day.date.toISOString().split('T')[0];
    
    // Try to get pools from provided data first, then from cache, then fetch if needed
    let pools = poolData || providedPool;
    if (!pools) {
      pools = this.inventoryPoolsByDate.get(dateKey);
    }
    
    // If still no pools and we're in a schedule context, try to fetch for this specific date
    if (!pools || pools.length === 0) {
      const collectionId = capturedCollectionId || this.collectionControl.value;
      const activityType = capturedActivityType || this.currentActivityType;
      const activityId = capturedActivityId || this.currentActivityId;
      const productId = capturedProductId || this.extractProductId(this.productControl.value);
      
      if (collectionId && activityType && activityId && productId) {
        try {
          const fetchedPools = await this.inventoryPoolService.getInventoryPools(
            collectionId,
            activityType,
            activityId,
            productId,
            dateKey,
            dateKey,
            undefined,
            true
          );
          
          // Treat null as a failure (getInventoryPools catches errors and returns null)
          if (!fetchedPools) {
            throw new Error('Failed to fetch pool data');
          }
          
          if (Array.isArray(fetchedPools) && fetchedPools.length > 0) {
            pools = fetchedPools.map((pool: any) => ({
              date: dateKey,
              capacity: pool.capacity || 0,
              availability: pool.availability || 0,
              available: pool.availability || 0,
              isOpen: pool.isOpen !== false,
              ...pool
            }));
          }
        } catch (fetchError) {
          this.toastService.addMessage(
            `Cannot toggle ${dateKey}: unable to fetch pool data.`,
            'Toggle Failed',
            ToastTypes.ERROR
          );
          return;
        }
      }
    }
    
    if (!pools || pools.length === 0) {
      return;
    }

    const pool = pools[0];
    const finalNewState = newState !== undefined ? newState : !pool.isOpen;

    const requestId = 'toggle-reservation';
    this.addLoadingId(requestId);
    try {
      const collectionId = capturedCollectionId || this.collectionControl.value;
      const activityType = capturedActivityType || this.currentActivityType;
      const activityId = capturedActivityId || this.currentActivityId;
      const productId = capturedProductId || this.extractProductId(this.productControl.value);

      if (!collectionId || !activityType || !activityId || !productId) {
        return;
      }

      let newCapacity = pool.capacity;
      let preCloseCapacityValue: number | null = null;

      if (finalNewState === false) {
        // Closing: set capacity to booked amount, persist original for reopening
        const bookedPasses = (pool.capacity || 0) - (pool.available || 0);
        newCapacity = bookedPasses;
        preCloseCapacityValue = pool.capacity; 
      } else if (finalNewState === true) {
        // Reopening: use provided newCapacity if available, otherwise restore from server-persisted preCloseCapacity
        if (newCapacityOverride !== undefined) {
          newCapacity = newCapacityOverride;
        } else if (pool['preCloseCapacity'] !== undefined) {
          newCapacity = pool['preCloseCapacity'];
        }
        // If no preCloseCapacity and no override, keep current capacity (could be 0 from schedule)
        preCloseCapacityValue = null; 
      }
      
      // Update if capacity changed OR if we're toggling the open state
      const isCapacityChanging = newCapacity !== pool.capacity;
      const isTogglingState = finalNewState !== pool.isOpen;
      
      if (isCapacityChanging || isTogglingState) {
        try {
          const response = await this.inventoryPoolService.updateInventoryPool(
            collectionId,
            activityType,
            activityId,
            productId,
            dateKey,
            newCapacity,
            'bulk',
            undefined,
            preCloseCapacityValue, // Send appropriate preCloseCapacity (save on close, clear on open)
            false, // clearManualEdit
            finalNewState // Send the toggle state (isOpen)
          );
          const oldCapacity = pool.capacity || 0;
          const capacityDelta = newCapacity - oldCapacity;
          const newAvailability = (pool.available || 0) + capacityDelta;
          pool.capacity = newCapacity;
          pool.available = Math.max(0, Math.min(newAvailability, newCapacity));
          // Persist preCloseCapacity from response so it survives page reloads
          // DONT UPDATE preCloseCapacity on open if it was cleared on the server
          if (response['preCloseCapacity'] !== undefined) {
            pool['preCloseCapacity'] = response['preCloseCapacity'];
          }
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
      await this.loadInventoryPoolData();
    } catch (error) {
      this.toastService.addMessage(
        `Failed to toggle reservation status. Please try again.`,
        'Toggle Failed',
        ToastTypes.ERROR
      );
    } finally {
      this.removeLoadingId(requestId);
    }
  }

  goBack() {
    this.router.navigate(['/inventory']);
  }
}

