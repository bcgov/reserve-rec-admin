import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneEditComponent } from './geozone-edit.component';

describe('GeozoneEditComponent', () => {
  let component: GeozoneEditComponent;
  let fixture: ComponentFixture<GeozoneEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
