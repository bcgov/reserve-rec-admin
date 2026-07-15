import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PassSearchComponent } from './pass-search.component';
import { ApiService } from '../../services/api.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { PassDetailsComponent } from '../pass-details/pass-details.component';

describe('PassSearchComponent', () => {
  let component: PassSearchComponent;
  let fixture: ComponentFixture<PassSearchComponent>;

  let mockApiService: any;
  let mockToastService: any;

  const fixedDate = new Date('2026-06-11T00:00:00Z');

  function createMockFn(implementation: (...args: any[]) => any) {
    if (typeof jest !== 'undefined') {
      return jest.fn(implementation);
    }

    return jasmine.createSpy().and.callFake(implementation);
  }

  function setMockReturnValue(mockFn: any, value: any) {
    if (typeof jest !== 'undefined') {
      mockFn.mockReturnValue(value);
      return;
    }

    mockFn.and.returnValue(value);
  }

  function objectContaining(value: any) {
    if (typeof jest !== 'undefined') {
      return expect.objectContaining(value);
    }

    return jasmine.objectContaining(value);
  }

  function setSystemDate(date: Date) {
    if (typeof jest !== 'undefined') {
      jest.useFakeTimers();
      jest.setSystemTime(date);
      return;
    }

    jasmine.clock().install();
    jasmine.clock().mockDate(date);
  }

  function restoreSystemDate() {
    if (typeof jest !== 'undefined') {
      jest.useRealTimers();
      return;
    }

    jasmine.clock().uninstall();
  }

  beforeEach(async () => {
    mockApiService = {
      post: createMockFn((path: string, body: any) => of({
        data: {
          total: { value: 1 },
          hits: [{ _source: { bookingId: '1', status: 'confirmed' } }]
        }
      }))
    };

    mockToastService = {
      addMessage: createMockFn((msg: string, title: string, type: string) => { })
    };

    await TestBed.configureTestingModule({
      imports: [PassSearchComponent, FormsModule, PassDetailsComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    setSystemDate(fixedDate);

    fixture = TestBed.createComponent(PassSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    restoreSystemDate();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search with keywords', async () => {
    const apiSpy = mockApiService.post;
    
    component.keyword = 'test';
    await component.search(true);
    
    expect(apiSpy).toHaveBeenCalledWith('bookings/search', objectContaining({
      text: 'test',
      from: 0,
      size: 5
    }));
    expect(component.bookings.length).toBe(1);
    expect(component.totalHits).toBe(1);
  });

  it('should clear all filters', () => {
    component.filterCriteria = { email: 'test@example.com', checkinStatus: 'active', startDate: '2024-01-01', endDate: '2024-01-02' };
    component.keyword = 'somekeyword';
    
    component.clearAllFilters();
    
    expect(component.filterCriteria.email).toBe('');
    expect(component.filterCriteria.checkinStatus).toBe('');
    expect(component.keyword).toBe('somekeyword');
  });

  it('should toggle filter panel', () => {
    expect(component.showFilterPanel).toBe(false);
    component.toggleFilterPanel();
    expect(component.showFilterPanel).toBe(true);
  });

  it('detects if filters are applied', () => {
    expect(component.filtersApplied).toBe(false);
    component.filterCriteria.email = 'test@example.com';
    expect(component.filtersApplied).toBe(true);
  });

  it('should forward search parameters clean to the backend when active is checked', async () => {
    const apiSpy = mockApiService.post;
    
    component.keyword = 'smith';
    component.filterCriteria.checkinStatus = 'active';
    
    await component.search(true);

    // Verify that frontend does not mutate or inject date overrides, 
    // leaving dynamic checkin status range logic safely with the backend.
    expect(apiSpy).toHaveBeenCalledWith('bookings/search', objectContaining({
      checkinStatus: 'active',
      startDate: undefined,
    }));
  });

  it('should display an error toast if the API request fails', async () => {
    const toastSpy = mockToastService.addMessage;
    
    // Force the mock to throw an error instead of returning data
    setMockReturnValue(mockApiService.post, throwError(() => ({
      error: { msg: 'Database timeout' }
    })));

    component.keyword = 'test';
    await component.search();

    expect(toastSpy).toHaveBeenCalledWith(
      'Database timeout',
      'Search failed',
      ToastTypes.ERROR
    );
    expect(component.isLoading).toBe(false);
  });

  it('should append results when loading the next page', async () => {
    // Setup initial state
    component.bookings = [{ _source: { bookingId: '456' } }];
    component.keyword = 'test';
    
    // Call search with newSearch = false
    await component.search(false, 1);

    // The mock returns 1 hit. The existing array has 1 item.
    // We expect the final array to have 2 items.
    expect(component.bookings.length).toBe(2);
    expect(component.currentPage).toBe(1);
  });
});
