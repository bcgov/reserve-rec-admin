import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutsourceCheckoutComponent } from './outsource-checkout.component';

describe('OutsourceCheckoutComponent', () => {
  let component: OutsourceCheckoutComponent;
  let fixture: ComponentFixture<OutsourceCheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutsourceCheckoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OutsourceCheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
