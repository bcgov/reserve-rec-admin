import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneDetailsComponent } from './geozone-details.component';
import { provideRouter } from '@angular/router';

describe('GeozoneDetailsComponent', () => {
  let component: GeozoneDetailsComponent;
  let fixture: ComponentFixture<GeozoneDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneDetailsComponent],
      providers: [provideRouter([])]
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
