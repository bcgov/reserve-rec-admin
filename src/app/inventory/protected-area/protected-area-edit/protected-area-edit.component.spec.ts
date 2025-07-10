import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtectedAreaEditComponent } from './protected-area-edit.component';

describe('ProtectedAreaEditComponent', () => {
  let component: ProtectedAreaEditComponent;
  let fixture: ComponentFixture<ProtectedAreaEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectedAreaEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProtectedAreaEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
