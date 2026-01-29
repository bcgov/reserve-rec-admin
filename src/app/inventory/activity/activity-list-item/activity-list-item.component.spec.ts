import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityListItemComponent } from './activity-list-item.component';

describe('ActivityListItemComponent', () => {
  let component: ActivityListItemComponent;
  let fixture: ComponentFixture<ActivityListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityListItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityListItemComponent);
    component = fixture.componentInstance;
  
    component.activity = {
      collectionId: 'test-collection',
      activityType: 'trail',
      activityId: 'test-activity-123',
      displayName: 'Test Activity'
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
