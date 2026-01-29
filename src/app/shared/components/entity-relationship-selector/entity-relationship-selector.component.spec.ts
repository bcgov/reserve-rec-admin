import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityRelationshipSelectorComponent } from './entity-relationship-selector.component';
import { RelationshipService } from '../../../services/relationship.service';
import { signal } from '@angular/core';

describe('EntityRelationshipSelectorComponent', () => {
  let component: EntityRelationshipSelectorComponent;
  let fixture: ComponentFixture<EntityRelationshipSelectorComponent>;
  let mockRelationshipService: jasmine.SpyObj<RelationshipService>;

  const mockConfig = {
    sourceSchema: 'activity',
    targetSchema: 'facility',
    label: 'Test Label',
    placeholder: 'Test Placeholder',
    multiselect: true,
    searchFields: { collectionId: 'test_collection' },
    fetchFn: jasmine.createSpy('fetchFn').and.returnValue(
      Promise.resolve({ items: [] })
    )
  };

  const mockSourceEntity = {
    schema: 'activity',
    pk: 'activity::test',
    sk: '1'
  };

  const mockFacility1 = {
    pk: 'facility::test',
    sk: '1',
    displayName: 'Test Facility 1',
    collectionId: 'test_collection'
  };

  const mockFacility2 = {
    pk: 'facility::test',
    sk: '2',
    displayName: 'Test Facility 2',
    collectionId: 'test_collection'
  };

  beforeEach(async () => {
    mockRelationshipService = jasmine.createSpyObj('RelationshipService', [
      'createRelationship',
      'deleteRelationship',
      'syncRelationships'
    ]);

    await TestBed.configureTestingModule({
      imports: [EntityRelationshipSelectorComponent],
      providers: [
        { provide: RelationshipService, useValue: mockRelationshipService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityRelationshipSelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.config = mockConfig;
    component.sourceEntity = mockSourceEntity;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should throw error if config is missing', () => {
    expect(() => {
      component.ngOnInit();
    }).toThrowError('EntityRelationshipSelectorComponent requires a config input');
  });

  it('should throw error if sourceSchema or targetSchema is missing', () => {
    component.config = { ...mockConfig, sourceSchema: '' };
    expect(() => {
      component.ngOnInit();
    }).toThrowError('Config must specify sourceSchema and targetSchema');
  });

  it('should load available entities on init', async () => {
    const mockEntities = [mockFacility1, mockFacility2];
    const mockFetchFn = jasmine.createSpy('fetchFn').and.returnValue(
      Promise.resolve({ items: mockEntities })
    );

    component.config = { ...mockConfig, fetchFn: mockFetchFn };
    component.sourceEntity = mockSourceEntity;

    await component.ngOnInit();
    await fixture.whenStable();

    expect(mockFetchFn).toHaveBeenCalledWith(mockConfig.searchFields);
    expect(component.availableEntities().length).toBe(2);
    expect(component.availableEntities()[0].display).toBe('Test Facility 1');
  });

  it('should apply custom filter function', async () => {
    const mockEntities = [mockFacility1, { ...mockFacility2, collectionId: 'other' }];
    const mockFetchFn = jasmine.createSpy('fetchFn').and.returnValue(
      Promise.resolve({ items: mockEntities })
    );
    const mockFilterFn = (entity: any) => entity.collectionId === 'test_collection';

    component.config = { ...mockConfig, fetchFn: mockFetchFn, filterFn: mockFilterFn };
    component.sourceEntity = mockSourceEntity;

    await component.ngOnInit();
    await fixture.whenStable();

    expect(component.availableEntities().length).toBe(1);
    expect(component.availableEntities()[0].value.collectionId).toBe('test_collection');
  });

  describe('selectEntity', () => {
    beforeEach(() => {
      component.config = mockConfig;
      component.sourceEntity = mockSourceEntity;
      component.selectedEntities = [];
      fixture.detectChanges();
    });

    it('should add entity to selection in multiselect mode', () => {
      const match = { value: mockFacility1, display: 'Test Facility 1' };
      component.selectEntity(match);

      expect(component.selectedEntities.length).toBe(1);
      expect(component.selectedEntities[0]).toEqual(mockFacility1);
    });

    it('should replace selection in single-select mode', () => {
      component.config = { ...mockConfig, multiselect: false };
      component.selectedEntities = [mockFacility1];

      const match = { value: mockFacility2, display: 'Test Facility 2' };
      component.selectEntity(match);

      expect(component.selectedEntities.length).toBe(1);
      expect(component.selectedEntities[0]).toEqual(mockFacility2);
    });

    it('should not add duplicate entities', () => {
      component.selectedEntities = [mockFacility1];

      const match = { value: mockFacility1, display: 'Test Facility 1' };
      component.selectEntity(match);

      expect(component.selectedEntities.length).toBe(1);
    });

    it('should emit relationshipsChanged event', () => {
      spyOn(component.relationshipsChanged, 'emit');
      const match = { value: mockFacility1, display: 'Test Facility 1' };
      
      component.selectEntity(match);

      expect(component.relationshipsChanged.emit).toHaveBeenCalledWith([mockFacility1]);
    });

    it('should emit relationshipAdded event', () => {
      spyOn(component.relationshipAdded, 'emit');
      const match = { value: mockFacility1, display: 'Test Facility 1' };
      
      component.selectEntity(match);

      expect(component.relationshipAdded.emit).toHaveBeenCalledWith(mockFacility1);
    });
  });

  describe('removeEntity', () => {
    beforeEach(() => {
      component.config = mockConfig;
      component.sourceEntity = mockSourceEntity;
      component.selectedEntities = [mockFacility1, mockFacility2];
      fixture.detectChanges();
    });

    it('should remove entity from selection', () => {
      component.removeEntity(mockFacility1);

      expect(component.selectedEntities.length).toBe(1);
      expect(component.selectedEntities[0]).toEqual(mockFacility2);
    });

    it('should emit relationshipsChanged event', () => {
      spyOn(component.relationshipsChanged, 'emit');
      
      component.removeEntity(mockFacility1);

      expect(component.relationshipsChanged.emit).toHaveBeenCalledWith([mockFacility2]);
    });

    it('should emit relationshipRemoved event', () => {
      spyOn(component.relationshipRemoved, 'emit');
      
      component.removeEntity(mockFacility1);

      expect(component.relationshipRemoved.emit).toHaveBeenCalledWith(mockFacility1);
    });
  });

  describe('getFilteredEntities', () => {
    beforeEach(() => {
      component.config = mockConfig;
      component.availableEntities.set([
        { value: mockFacility1, display: 'Test Facility 1' },
        { value: mockFacility2, display: 'Test Facility 2' }
      ]);
      fixture.detectChanges();
    });

    it('should return all entities when search is empty', () => {
      component.searchControl.setValue('');
      const filtered = component.getFilteredEntities();

      expect(filtered.length).toBe(2);
    });

    it('should filter entities by search term', () => {
      component.searchControl.setValue('facility 1');
      const filtered = component.getFilteredEntities();

      expect(filtered.length).toBe(1);
      expect(filtered[0].display).toBe('Test Facility 1');
    });

    it('should be case-insensitive', () => {
      component.searchControl.setValue('FACILITY 1');
      const filtered = component.getFilteredEntities();

      expect(filtered.length).toBe(1);
      expect(filtered[0].display).toBe('Test Facility 1');
    });
  });
});
