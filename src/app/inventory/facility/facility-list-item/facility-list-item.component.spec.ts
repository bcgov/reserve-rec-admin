import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityListItemComponent } from './facility-list-item.component';

describe('FacilityListItemComponent', () => {
  let component: FacilityListItemComponent;
  let fixture: ComponentFixture<FacilityListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityListItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityListItemComponent);
    component = fixture.componentInstance;
  
    component.facility = {
      collectionId: 'test-collection',
      facilityType: 'trail',
      facilityId: 'test-facility-123',
      displayName: 'Test Facility'
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
