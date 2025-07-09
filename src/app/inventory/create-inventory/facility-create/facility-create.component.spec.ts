import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCreateComponent } from './facility-create.component';

describe('FacilityCreateComponent', () => {
  let component: FacilityCreateComponent;
  let fixture: ComponentFixture<FacilityCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
