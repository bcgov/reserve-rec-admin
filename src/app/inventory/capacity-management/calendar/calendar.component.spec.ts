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
