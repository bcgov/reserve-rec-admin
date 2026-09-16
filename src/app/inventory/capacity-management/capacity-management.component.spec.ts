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

  beforeEach(() => {
    // updateSchedule skips dates before today, so pin "now" to the start of the
    // window instead of letting the clock age the fixture out.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T00:00:00Z'));
    component = new CapacityManagementComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new FormBuilder(),
      {} as any,
      {} as any
    );
    (component as any).loadal = { show: () => {}, hide: () => {} };
    updateSingleDaySpy = jest
      .spyOn(component as any, 'updateSingleDay')
      .mockResolvedValue(true);
    jest
      .spyOn(component as any, 'loadInventoryPoolData')
      .mockResolvedValue(undefined);
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

  it('never touches inventory when no day-of-week is checked', async () => {
    const start = new Date('2026-09-14T00:00:00Z');
    const end = new Date('2026-09-20T00:00:00Z');
    const days = buildDays([]);

    await (component as any).updateSchedule(start, end, days, [], false, [], false);

    expect(updateSingleDaySpy).not.toHaveBeenCalled();
  });
});
