import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadalComponent } from './loadal.component';

describe('LoadalComponent', () => {
  let component: LoadalComponent;
  let fixture: ComponentFixture<LoadalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
