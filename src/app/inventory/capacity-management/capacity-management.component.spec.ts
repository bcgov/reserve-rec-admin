// The loadal pulls in bootstrap's untranspiled ESM bundle, which jest will not
// parse; nothing here touches the real spinner.
jest.mock('../../shared/components/loadal/loadal.component', () => ({
  LoadalComponent: class {},
}));

import { FormBuilder } from '@angular/forms';
import { CapacityManagementComponent } from './capacity-management.component';

describe('CapacityManagementComponent - updateSchedule', () => {
  let component: CapacityManagementComponent;
  let updateSingleDaySpy: jest.SpyInstance;
  let loadingServiceMock: any;
  let inventoryPoolServiceMock: any;

  beforeEach(() => {
    // updateSchedule skips dates before today, so pin "now" to the start of the
    // window instead of letting the clock age the fixture out.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T00:00:00Z'));
    
    // Mock LoadingService
    loadingServiceMock = {
      addToFetchList: jest.fn(),
      removeFromFetchList: jest.fn()
    };
    
    // Mock ToastService
    const toastServiceMock = {
      addMessage: jest.fn()
    } as any;
    
    // Mock InventoryPoolService
    inventoryPoolServiceMock = {
      getInventoryPools: jest.fn().mockResolvedValue([])
    };
    
    component = new CapacityManagementComponent(
      {} as any,
      {} as any,
      inventoryPoolServiceMock,
      {} as any,
      {} as any,
      new FormBuilder(),
      {} as any,
      toastServiceMock,
      loadingServiceMock
    );
    updateSingleDaySpy = jest
      .spyOn(component as any, 'updateSingleDay')
      .mockResolvedValue(true);
    jest
      .spyOn(component as any, 'loadInventoryPoolData')
      .mockResolvedValue(undefined);
    
    // Mock toggleReservationStatus to simulate toggling a day closed
    jest
      .spyOn(component as any, 'toggleReservationStatus')
      .mockImplementation(async (event: any) => {
        if (event.isOpen === false) {
          const dateKey = event.day.date.toISOString().split('T')[0];
          const bookedAmount = 0; 
          await (component as any).updateSingleDay(event.day, bookedAmount, false, undefined, false);
        }
      });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildDays(activeDays: number[]): any[] {
    return Array.from({ length: 7 }, (_, index) => ({
      day: index,
      index,
      passesRequired: activeDays.includes(index),
      defaultCapacity: activeDays.includes(index) ? 10 : 0
    }));
  }

  it('only applies capacity to checked days-of-week (Mon 2026-09-14 to Sun 2026-09-20, Mon+Fri checked)', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([1, 5]); // Monday, Friday

    await (component as any).updateSchedule(start, end, days, [], false, [], false);

    expect(updateSingleDaySpy).toHaveBeenCalledTimes(2);
    const calledDaysOfWeek = updateSingleDaySpy.mock.calls.map((args: any[]) => args[0].date.getUTCDay());
    expect(calledDaysOfWeek.sort()).toEqual([1, 5]);
  });

  it('skips unchecked days entirely instead of writing zero capacity', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([1]); // only Monday checked

    await (component as any).updateSchedule(start, end, days, [], false, [], false);

    expect(updateSingleDaySpy).toHaveBeenCalledTimes(1);
    expect(updateSingleDaySpy.mock.calls[0][1]).toBe(10);
  });

  // #422 again: an unchecked day that already carries capacity from an earlier
  // schedule stayed open, so a Mon/Wed/Fri schedule still read as every day on.
  it('zeroes an unchecked day that already has capacity when overwriting is allowed', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([1, 3, 5]); // Mon, Wed, Fri
    const existing = [{ date: '2026-09-15', capacity: 10, booked: 0, lastUpdated: '' }]; // Tuesday
    const bookedByDate = new Map(existing.map((e: any) => [e.date, e.booked || 0]));
    jest
      .spyOn(component as any, 'toggleReservationStatus')
      .mockImplementation(async (event: any) => {
        if (event.isOpen === false) {
          const dateKey = event.day.date.toISOString().split('T')[0];
          const bookedAmount = bookedByDate.get(dateKey) || 0;
          await (component as any).updateSingleDay(event.day, bookedAmount, false, undefined, false);
        }
      });

    await (component as any).updateSchedule(start, end, days, [], false, existing, true);

    const calls = updateSingleDaySpy.mock.calls.map((args: any[]) => [
      args[0].date.toISOString().split('T')[0],
      args[1]
    ]);
    expect(calls).toContainEqual(['2026-09-15', 0]);
  });

  it('leaves an unchecked day with existing capacity alone when overwriting is off', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([1, 3, 5]);
    const existing = [{ date: '2026-09-15', capacity: 10, lastUpdated: '' }];

    await (component as any).updateSchedule(start, end, days, [], false, existing, false);

    const dates = updateSingleDaySpy.mock.calls.map((args: any[]) => args[0].date.toISOString().split('T')[0]);
    expect(dates).not.toContain('2026-09-15');
  });

  // The toggle refuses to close a day that has passes booked; a schedule that
  // turns the day off must not wipe that capacity out either.
  it('winds an unchecked day down to its booked passes rather than to zero', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([1, 3, 5]); // Mon, Wed, Fri
    const existing = [{ date: '2026-09-15', capacity: 10, booked: 4, lastUpdated: '' }];

    // Mock toggleReservationStatus for this test to call updateSingleDay with booked amount
    const bookedByDate = new Map(existing.map((e: any) => [e.date, e.booked || 0]));
    jest
      .spyOn(component as any, 'toggleReservationStatus')
      .mockImplementation(async (event: any) => {
        if (event.isOpen === false) {
          const dateKey = event.day.date.toISOString().split('T')[0];
          const bookedAmount = bookedByDate.get(dateKey) || 0;
          await (component as any).updateSingleDay(event.day, bookedAmount, false, undefined, false);
        }
      });

    await (component as any).updateSchedule(start, end, days, [], false, existing, true);

    const calls = updateSingleDaySpy.mock.calls.map((args: any[]) => [
      args[0].date.toISOString().split('T')[0],
      args[1]
    ]);
    expect(calls).toContainEqual(['2026-09-15', 4]);
  });

  it('never touches inventory when no day-of-week is checked', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([]);

    await (component as any).updateSchedule(start, end, days, [], false, [], false);

    expect(updateSingleDaySpy).not.toHaveBeenCalled();
  });

  it('manages loading state with addToFetchList and removeFromFetchList', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([1]);

    await (component as any).updateSchedule(start, end, days, [], false, [], false);

    expect(loadingServiceMock.addToFetchList).toHaveBeenCalledWith('update-schedule');
    expect(loadingServiceMock.removeFromFetchList).toHaveBeenCalledWith('update-schedule');
  });
});
