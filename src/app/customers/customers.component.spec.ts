import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { CustomersComponent } from './customers.component';
import { CustomerService } from '../services/customer.service';
import { LoggerService } from '../services/logger.service';
import { LoadingService } from '../services/loading.service';
import { RealtimeEvent, RealtimeService } from '../services/realtime.service';
import { AuthService } from '../services/auth.service';

describe('CustomersComponent', () => {
  let component: CustomersComponent;
  let fixture: ComponentFixture<CustomersComponent>;

  let mockCustomerService: any;
  let mockLoggerService: any;

  // Fresh objects per test - the component writes hasActiveBooking onto the customer.
  const withBooking = () => ({ sub: 'sub-1', email: 'a@example.com', givenName: 'A', familyName: 'Camper' });
  const withoutBooking = () => ({ sub: 'sub-2', email: 'b@example.com', givenName: 'B', familyName: 'Camper' });

  function setup(users: any[] = [], subsWithBooking: string[] = []) {
    mockCustomerService = {
      searchCustomers: jest.fn().mockResolvedValue({ data: { hits: users } }),
      getSubsWithCurrentBooking: jest.fn().mockResolvedValue(new Set(subsWithBooking)),
    };
    mockLoggerService = { info: jest.fn(), error: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: LoadingService, useValue: { addToFetchList: jest.fn(), removeFromFetchList: jest.fn() } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: RealtimeService, useValue: { topic$: jest.fn(), reconnected$: new Subject<void>() } },
        { provide: AuthService, useValue: { isSuperAdmin: () => false } },
      ],
    }).compileComponents();
  }

  async function create() {
    fixture = TestBed.createComponent(CustomersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Two passes: the first settles the customer search, the second the booking
    // lookup it kicks off.
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('asks for the active booking flags of the customers it just loaded', async () => {
    await setup([withBooking(), withoutBooking()], ['sub-1']);
    await create();

    expect(mockCustomerService.getSubsWithCurrentBooking).toHaveBeenCalledWith(['sub-1', 'sub-2']);
  });

  it('shows yes only for customers holding a current booking', async () => {
    await setup([withBooking(), withoutBooking()], ['sub-1']);
    await create();

    expect(component.getValue(component.customers[0], 'activeBooking')).toBe('yes');
    expect(component.getValue(component.customers[1], 'activeBooking')).toBe('no');
  });

  it('falls back to a dash when the booking lookup fails', async () => {
    await setup([withBooking()], []);
    mockCustomerService.getSubsWithCurrentBooking.mockRejectedValue(new Error('opensearch down'));
    await create();

    expect(component.getValue(component.customers[0], 'activeBooking')).toBe('-');
    expect(mockLoggerService.error).toHaveBeenCalled();
  });

  describe('load more', () => {
    const user = (n: number) => ({ sub: `sub-${n}`, email: `u${n}@example.com` });
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => user(from + i));

    // Three signups between pages shift users 18-20 from the end of page one onto page two.
    async function loadTwoPagesWithSignupsBetween() {
      await setup(range(1, 20));
      await create();
      mockCustomerService.searchCustomers.mockResolvedValueOnce({ data: { hits: range(18, 37) } });
      mockCustomerService.getSubsWithCurrentBooking.mockClear();
      await component.loadMore();
    }

    it('does not repeat customers that shifted onto the next page', async () => {
      await loadTwoPagesWithSignupsBetween();

      expect(component.customers.map((c) => c.sub)).toEqual(range(1, 37).map((u) => u.sub));
    });

    it('advances the offset by the full page so the next page carries on from it', async () => {
      await loadTwoPagesWithSignupsBetween();

      expect(component.currentOffset).toBe(40);
      expect(mockCustomerService.searchCustomers).toHaveBeenLastCalledWith(expect.objectContaining({ from: 20 }));
    });

    it('looks up booking flags only for the customers it added', async () => {
      await loadTwoPagesWithSignupsBetween();

      expect(mockCustomerService.getSubsWithCurrentBooking).toHaveBeenCalledWith(range(21, 37).map((u) => u.sub));
    });
  });
});

describe('CustomersComponent live updates', () => {
  let fixture: ComponentFixture<CustomersComponent>;
  let component: CustomersComponent;
  let events: Subject<RealtimeEvent>;
  let reconnected: Subject<void>;
  let mockCustomerService: any;
  let superAdmin: boolean;

  const existing = { sub: 'sub-existing', givenName: 'Old', familyName: 'Timer', email: 'old@example.com' };
  const ann = { sub: 'sub-ann', givenName: 'Ann', familyName: 'Smith', email: 'ann@example.com' };

  function event(type: string, id: string, extra: Partial<RealtimeEvent> = {}, data: any = {}): RealtimeEvent {
    return {
      v: 1, topic: 'customers', type, id, at: 1, ...extra,
      data: {
        givenName: 'New', familyName: 'Camper', email: `${id}@example.com`,
        mobilePhone: '250-555-0100', createdAt: '2026-10-09T12:00:00Z', ...data,
      },
    };
  }

  function hits(...users: any[]) {
    return { data: { hits: users } };
  }

  function rowTexts(): string[] {
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('tbody tr'))
      .map((tr: any) => tr.textContent.replace(/\s+/g, ' ').trim());
  }

  function highlightedRows(): number {
    fixture.detectChanges();
    return fixture.nativeElement.querySelectorAll('tbody tr.table-success').length;
  }

  async function search(query: string, result: any) {
    mockCustomerService.searchCustomers.mockResolvedValueOnce(result);
    component.searchQuery = query;
    await component.onSearch();
    mockCustomerService.searchCustomers.mockClear();
  }

  async function create(firstPage: Promise<any> = Promise.resolve(hits(existing))) {
    mockCustomerService.searchCustomers.mockReturnValueOnce(firstPage);
    fixture = TestBed.createComponent(CustomersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    events = new Subject<RealtimeEvent>();
    reconnected = new Subject<void>();
    superAdmin = true;
    mockCustomerService = {
      searchCustomers: jest.fn().mockResolvedValue(hits()),
      getSubsWithCurrentBooking: jest.fn().mockResolvedValue(new Set()),
      selectedCustomer: null,
    };

    await TestBed.configureTestingModule({
      imports: [CustomersComponent],
      providers: [
        provideRouter([]),
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: RealtimeService, useValue: { topic$: jest.fn(() => events.asObservable()), reconnected$: reconnected } },
        { provide: AuthService, useValue: { isSuperAdmin: () => superAdmin } },
        { provide: LoggerService, useValue: { info: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('after the first page has loaded', () => {
    beforeEach(async () => {
      await create();
      await fixture.whenStable();
      mockCustomerService.searchCustomers.mockClear();
    });

    it('subscribes to the customers topic', () => {
      expect(TestBed.inject(RealtimeService).topic$).toHaveBeenCalledWith('customers');
      expect(events.observed).toBe(true);
    });

    it.each(['created', 'added'])('puts a %s customer at the top of an unfiltered list, highlighted briefly', (type) => {
      jest.useFakeTimers();
      events.next(event(type, 'sub-new'));

      const rows = rowTexts();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain('sub-new@example.com');
      expect(rows[0]).toContain('New Camper');
      expect(rows[0]).toContain('250-555-0100');
      expect(rows[1]).toContain('old@example.com');
      expect(highlightedRows()).toBe(1);

      jest.advanceTimersByTime(5000);
      expect(highlightedRows()).toBe(0);
    });

    it.each([['created', 'no'], ['added', '-']])('shows activeBooking for a %s customer as %s', (type, expected) => {
      events.next(event(type, 'sub-new'));

      expect(component.getValue(component.customers[0], 'activeBooking')).toBe(expected);
    });

    it('passes a live row, marked live, to the detail page on View', () => {
      const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      events.next(event('created', 'sub-new'));
      rowTexts();

      fixture.nativeElement.querySelector('tbody tr button').click();

      expect(navigate).toHaveBeenCalledWith(['/customers', 'sub-new']);
      expect(mockCustomerService.selectedCustomer).toEqual(expect.objectContaining({
        sub: 'sub-new', email: 'sub-new@example.com', mobilePhone: '250-555-0100', live: true,
      }));
    });

    it('ignores a customer already in the list', () => {
      events.next(event('added', 'sub-existing', { collectionId: 'park-a' }, { givenName: 'Dupe' }));

      expect(rowTexts()).toEqual([expect.stringContaining('Old Timer')]);
    });

    it('shows a redelivered event again once its row has left the list', async () => {
      const first = event('added', 'sub-new', { collectionId: 'park-a' });
      events.next(first);
      await search('zzz', hits());
      await search('', hits(existing));

      events.next(first);

      expect(rowTexts()[0]).toContain('sub-new@example.com');
    });

    it('drops a live row from before a reload that does not return it', async () => {
      events.next(event('created', 'sub-new'));
      await search('', hits(existing));

      expect(rowTexts()).toEqual([expect.stringContaining('old@example.com')]);
    });

    it('follows the search whose results are on screen when searches overlap', async () => {
      let resolveFirst!: (value: any) => void;
      let resolveSecond!: (value: any) => void;
      mockCustomerService.searchCustomers
        .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
        .mockReturnValueOnce(new Promise((r) => (resolveSecond = r)));
      component.searchQuery = 'smith';
      const first = component.onSearch();
      component.searchQuery = 'jones';
      const second = component.onSearch();
      resolveSecond(hits({ sub: 'sub-jones', givenName: 'Jo', familyName: 'Jones', email: 'jo@example.com' }));
      await second;
      resolveFirst(hits(ann));
      await first;

      events.next(event('created', 'sub-smith', {}, { familyName: 'Smith' }));
      events.next(event('created', 'sub-jones2', {}, { familyName: 'Jones' }));

      const rows = rowTexts();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain('sub-jones2@example.com');
      expect(rows[1]).toContain('jo@example.com');
      expect(component.loading).toBe(false);
    });

    it('ignores event types other than created and added', () => {
      events.next(event('updated', 'sub-other'));

      expect(rowTexts()).toHaveLength(1);
    });

    describe('with a search active', () => {
      beforeEach(async () => {
        await search('SMITH', hits(ann));
      });

      it('inserts a matching customer at the top without searching again', () => {
        events.next(event('added', 'sub-bob', {}, { givenName: 'Bob', familyName: 'Smith' }));

        const rows = rowTexts();
        expect(rows).toHaveLength(2);
        expect(rows[0]).toContain('Bob Smith');
        expect(rows[1]).toContain('Ann Smith');
        expect(mockCustomerService.searchCustomers).not.toHaveBeenCalled();
      });

      it.each([
        ['email', { email: 'jsmith@example.com' }],
        ['mobile phone', { mobilePhone: '778-SMITH' }],
      ])('matches on %s', (_field, data) => {
        events.next(event('created', 'sub-match', {}, { givenName: 'Jo', familyName: 'Doe', ...data }));

        expect(rowTexts()[0]).toContain('Jo Doe');
      });

      it('matches when any word of the search matches', async () => {
        await search('ann  jones', hits());
        events.next(event('created', 'sub-bob', {}, { givenName: 'Bob', familyName: 'Jones' }));
        events.next(event('created', 'sub-kim', {}, { givenName: 'Kim', familyName: 'Lee' }));

        expect(rowTexts()).toEqual([expect.stringContaining('Bob Jones')]);
      });

      it('leaves out a customer who does not match', () => {
        events.next(event('created', 'sub-jones', {}, { familyName: 'Jones' }));

        expect(rowTexts()).toEqual([expect.stringContaining('Ann Smith')]);
      });
    });

    it('fetches page 1 after a reconnect and adds customers it has not shown', async () => {
      const missed = { sub: 'sub-missed', givenName: 'Missed', familyName: 'Signup', email: 'missed@example.com' };
      mockCustomerService.searchCustomers.mockResolvedValueOnce(hits(missed, existing));

      reconnected.next();
      await fixture.whenStable();

      expect(mockCustomerService.searchCustomers).toHaveBeenCalledWith({ limit: 20, from: 0 });
      const rows = rowTexts();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain('missed@example.com');
      expect(rows[1]).toContain('old@example.com');
    });

    it('looks up booking flags only for the customers a catch-up adds', async () => {
      const missed = { sub: 'sub-missed', givenName: 'Missed', familyName: 'Signup', email: 'missed@example.com' };
      mockCustomerService.searchCustomers.mockResolvedValueOnce(hits(missed, existing));
      mockCustomerService.getSubsWithCurrentBooking.mockClear();

      reconnected.next();
      await fixture.whenStable();

      expect(mockCustomerService.getSubsWithCurrentBooking).toHaveBeenCalledWith(['sub-missed']);
    });

    it('drops a catch-up page when a search is applied while it is in flight', async () => {
      const missed = { sub: 'sub-missed', givenName: 'Missed', familyName: 'Signup', email: 'missed@example.com' };
      let resolveCatchUp!: (value: any) => void;
      mockCustomerService.searchCustomers.mockReturnValueOnce(new Promise((r) => (resolveCatchUp = r)));
      reconnected.next();

      await search('smith', hits(ann));
      resolveCatchUp(hits(missed, existing));
      await fixture.whenStable();

      expect(rowTexts()).toEqual([expect.stringContaining('ann@example.com')]);
    });

    it('does not fetch after a reconnect while a search is active', async () => {
      await search('smith', hits(ann));

      reconnected.next();
      await fixture.whenStable();

      expect(mockCustomerService.searchCustomers).not.toHaveBeenCalled();
    });

    it('advances Load More by the full page and skips rows already shown', async () => {
      await search('s', hits(...Array.from({ length: 20 }, (_, i) => ({ sub: `s${i}`, email: `s${i}@x.ca` }))));
      mockCustomerService.searchCustomers.mockResolvedValueOnce(hits({ sub: 's19', email: 's19@x.ca' }, ann));
      component.searchQuery = 'typed but not searched';

      await component.loadMore();

      expect(mockCustomerService.searchCustomers).toHaveBeenCalledWith({ query: 's', limit: 20, from: 20 });
      expect(component.currentOffset).toBe(22);
      const rows = rowTexts();
      expect(rows).toHaveLength(21);
      expect(rows[20]).toContain('ann@example.com');
    });

    it('unsubscribes on destroy and ignores later events', () => {
      fixture.destroy();

      expect(events.observed).toBe(false);
      expect(reconnected.observed).toBe(false);
    });
  });

  it('does not subscribe for an admin who is not a superadmin', async () => {
    superAdmin = false;
    await create();
    await fixture.whenStable();

    expect(TestBed.inject(RealtimeService).topic$).not.toHaveBeenCalled();
    expect(events.observed).toBe(false);
    expect(reconnected.observed).toBe(false);
    expect(rowTexts()).toEqual([expect.stringContaining('old@example.com')]);
  });

  it('keeps an event that arrives while the first page is loading', async () => {
    let resolveFirstPage!: (value: any) => void;
    await create(new Promise((resolve) => (resolveFirstPage = resolve)));

    events.next(event('created', 'sub-new'));
    resolveFirstPage(hits(existing));
    await fixture.whenStable();

    const rows = rowTexts();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('sub-new@example.com');
    expect(rows[1]).toContain('old@example.com');
  });
});
