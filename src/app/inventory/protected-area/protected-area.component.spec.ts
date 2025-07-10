import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtectedAreaComponent } from './protected-area.component';

describe('ProtectedAreaComponent', () => {
  let component: ProtectedAreaComponent;
  let fixture: ComponentFixture<ProtectedAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectedAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProtectedAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
