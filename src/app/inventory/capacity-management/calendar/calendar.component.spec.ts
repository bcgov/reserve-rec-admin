import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

// #476 review: the past-day and closed-day rules on mobile live in the
// template, so these render it rather than calling the class.
describe('CalendarComponent mobile template', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let component: CalendarComponent;

  function day(offsetDays: number): CalendarDay {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return { date, isCurrentMonth: true };
  }

  function render(d: CalendarDay, pool: Partial<InventoryPoolData> | null): HTMLElement {
    const pools = new Map<string, InventoryPoolData[]>();
    if (pool) {
      pools.set(component.formatDateKey(d.date), [{ capacity: 50, available: 50, isOpen: true, ...pool } as InventoryPoolData]);
    }
    fixture.componentRef.setInput('calendarDays', [d]);
    fixture.componentRef.setInput('inventoryPoolsByDate', pools);
    fixture.detectChanges();
    component.selectDay(d);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const editButton = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button[aria-label="Edit passes"]');
  const dayButton = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button.mobile-day')!;
  const panelChip = (el: HTMLElement) => el.querySelector('.day-panel .capacity-chip')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CalendarComponent] }).compileComponents();
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
  });

  it('offers no passes edit on a past day', () => {
    expect(editButton(render(day(-1), {}))).toBeNull();
  });

  it('disables the passes edit on a closed day', () => {
    expect(editButton(render(day(2), { isOpen: false }))!.disabled).toBe(true);
  });

  it('allows the passes edit on an open future day', () => {
    expect(editButton(render(day(2), {}))!.disabled).toBe(false);
  });

  // A day with no pool yet is how capacity gets added on mobile.
  it('allows the passes edit on a day with no pool yet', () => {
    expect(editButton(render(day(2), null))!.disabled).toBe(false);
  });

  it('disables the toggle on a past day', () => {
    const toggle = render(day(-1), {}).querySelector<HTMLInputElement>('.day-panel input[type="checkbox"]')!;
    expect(toggle.disabled).toBe(true);
  });

  // Grey alone does not reach a screen reader.
  it('names a closed day as closed', () => {
    expect(dayButton(render(day(2), { isOpen: false })).textContent).toContain('closed');
  });

  it('does not name an open day as closed', () => {
    expect(dayButton(render(day(2), {})).textContent).not.toContain('closed');
  });

  // The cell and the panel used different rules for a day with no pool.
  it.each([
    ['closed', { isOpen: false }, true],
    ['with no pool', null, true],
    ['open', {}, false],
  ])('greys the cell and the panel alike for a day %s', (_label, pool, grey) => {
    const el = render(day(2), pool);
    expect(dayButton(el).classList.contains('closed')).toBe(grey);
    expect(panelChip(el).classList.contains('closed')).toBe(grey);
  });

  // The live region used to wrap the whole panel, so opening the editor
  // re-announced everything; only the selected-day line should be live.
  it('announces only the selected day', () => {
    const el = render(day(2), {});
    const live = el.querySelectorAll('[aria-live]');
    expect(live.length).toBe(1);
    expect(live[0].querySelector('form, button, input')).toBeNull();
    expect(live[0].textContent).toContain('selected');
  });
});
