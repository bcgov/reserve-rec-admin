import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityCreateComponent } from './activity-create.component';

describe('ActivityCreateComponent', () => {
  let component: ActivityCreateComponent;
  let fixture: ComponentFixture<ActivityCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
