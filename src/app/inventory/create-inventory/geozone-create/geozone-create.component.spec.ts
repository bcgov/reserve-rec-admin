import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneCreateComponent } from './geozone-create.component';

describe('GeozoneCreateComponent', () => {
  let component: GeozoneCreateComponent;
  let fixture: ComponentFixture<GeozoneCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
