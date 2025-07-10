import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtectedAreasEditComponent } from './protected-area-edit.component';

describe('ProtectedAreasEditComponent', () => {
  let component: ProtectedAreasEditComponent;
  let fixture: ComponentFixture<ProtectedAreasEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectedAreasEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProtectedAreasEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
