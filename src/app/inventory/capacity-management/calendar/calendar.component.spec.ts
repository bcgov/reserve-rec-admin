import { SimpleChange } from '@angular/core';
import { CalendarComponent, CalendarDay, InventoryPoolData } from './calendar.component';

// #391: the calendar shows Passes and Reserved; this adds Checked in, with NA
// where a count would be misleading. Exercised on the class directly — the
// rule is date/count logic, not template wiring.
describe('CalendarComponent checked-in display', () => {
  let component: CalendarComponent;

  function day(offsetDays: number): CalendarDay {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return { date, isCurrentMonth: true } as CalendarDay;
  }

  function withPool(d: CalendarDay, pool: Partial<InventoryPoolData> | null) {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool as InventoryPoolData);
    return component.checkedInDisplay(d);
  }

  beforeEach(() => {
    component = new CalendarComponent();
  });

  it('shows the count when passes have been checked in', () => {
    expect(withPool(day(-1), { checkedInCount: 12 })).toBe(12);
  });

  it('shows 0 for a past date where nobody checked in', () => {
    expect(withPool(day(-1), { checkedInCount: 0 })).toBe(0);
  });

  it('shows 0 for today with nobody checked in yet', () => {
    expect(withPool(day(0), { checkedInCount: 0 })).toBe(0);
  });

  // 0 on a day that has not happened reads as "nobody turned up".
  it('shows NA for a future date with no check-ins', () => {
    expect(withPool(day(3), { checkedInCount: 0 })).toBe('NA');
  });

  it('still shows a real count on a future date', () => {
    expect(withPool(day(3), { checkedInCount: 2 })).toBe(2);
  });

  // undefined means "not counted" — the API omits it unless asked, and drops
  // it rather than failing the request if the tally errors.
  it('shows NA when the response carried no count', () => {
    expect(withPool(day(-1), { capacity: 100 })).toBe('NA');
  });

  it('shows NA when there is no pool for the day', () => {
    expect(withPool(day(-1), null)).toBe('NA');
  });
});

// #463 mobile design: tapping a day opens a panel under the calendar where the
// passes can be edited inline instead of in the edit modal.
describe('CalendarComponent mobile day panel', () => {
  let component: CalendarComponent;
  let saved: { day: CalendarDay; capacity: number }[];
  const may2: CalendarDay = { date: new Date(2026, 4, 2), isCurrentMonth: true };
  const may3: CalendarDay = { date: new Date(2026, 4, 3), isCurrentMonth: true };

  function pool(capacity: number, available: number): InventoryPoolData {
    return { date: '2026-05-02', capacity, availability: available, available, isOpen: true };
  }

  beforeEach(() => {
    component = new CalendarComponent();
    saved = [];
    component.saveCapacity.subscribe(e => saved.push(e));
  });

  it('selects the tapped day and only that day', () => {
    component.selectDay(may2);
    expect(component.isSelected(may2)).toBe(true);
    expect(component.isSelected(may3)).toBe(false);
  });

  it('drops an open edit when another day is selected', () => {
    component.selectDay(may2);
    component.startEdit();
    component.saveEdit(may2, '-1');
    component.selectDay(may3);
    expect(component.editing).toBe(false);
    expect(component.editError).toBe('');
  });

  it('emits the new passes and closes the editor', () => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool(50, 50));
    component.startEdit();
    component.saveEdit(may2, '60');
    expect(saved).toEqual([{ day: may2, capacity: 60 }]);
    expect(component.editing).toBe(false);
  });

  it('closes without saving when the value did not change', () => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool(50, 50));
    component.startEdit();
    component.saveEdit(may2, '50');
    expect(saved).toEqual([]);
    expect(component.editing).toBe(false);
  });

  // A day with no pool yet is how capacity gets added on mobile.
  it('saves passes for a day with no pool yet', () => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(null);
    component.startEdit();
    component.saveEdit(may2, '20');
    expect(saved).toEqual([{ day: may2, capacity: 20 }]);
  });

  it.each(['', '-1', '2.5', 'abc'])('rejects %p and keeps the editor open', value => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool(50, 50));
    component.startEdit();
    component.saveEdit(may2, value);
    expect(saved).toEqual([]);
    expect(component.editing).toBe(true);
    expect(component.editError).not.toBe('');
  });

  // Same rule as the edit modal: capacity cannot drop below what is booked.
  it('rejects passes below the booked count', () => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool(50, 47));
    component.startEdit();
    component.saveEdit(may2, '2');
    expect(saved).toEqual([]);
    expect(component.editError).toContain('3');
  });

  it('accepts passes equal to the booked count', () => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool(50, 47));
    component.startEdit();
    component.saveEdit(may2, '3');
    expect(saved).toEqual([{ day: may2, capacity: 3 }]);
  });

  // The calendar instance survives month and product changes (the parent only
  // swaps its inputs), so a kept selection would point at a day no longer
  // shown and save against a pool that is not loaded, skipping the booked floor.
  it('clears the selection and editor when the days change', () => {
    component.selectDay(may2);
    component.startEdit();
    component.ngOnChanges({ calendarDays: new SimpleChange([], [], false) });
    expect(component.selectedDay).toBeNull();
    expect(component.editing).toBe(false);
  });

  it('keeps the selection when other inputs change', () => {
    component.selectDay(may2);
    component.ngOnChanges({ productRangeEnd: new SimpleChange('', '2026-06-01', false) });
    expect(component.selectedDay).toBe(may2);
  });

  // Desktop disables the pencil on a closed day; an editor left open across
  // the toggle would save capacity onto a closed day.
  it('closes the editor when the day is toggled', () => {
    jest.spyOn(component, 'getInventoryPoolDataForDay').mockReturnValue(pool(50, 50));
    component.selectDay(may2);
    component.startEdit();
    component.onToggleReservation(may2);
    expect(component.editing).toBe(false);
  });
});
