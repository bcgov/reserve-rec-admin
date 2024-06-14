import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BamboraComponent } from './bambora.component';

describe('BamboraComponent', () => {
  let component: BamboraComponent;
  let fixture: ComponentFixture<BamboraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BamboraComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BamboraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
