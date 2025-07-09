import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneDetailsComponent } from './geozone-details.component';

describe('GeozoneDetailsComponent', () => {
  let component: GeozoneDetailsComponent;
  let fixture: ComponentFixture<GeozoneDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
