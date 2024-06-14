import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupFormComponent } from './setup-form.component';

describe('SetupFormComponent', () => {
  let component: SetupFormComponent;
  let fixture: ComponentFixture<SetupFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
