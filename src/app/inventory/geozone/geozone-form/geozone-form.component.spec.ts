import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneFormComponent } from './geozone-form.component';
import { ConfigService } from '../../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('GeozoneFormComponent', () => {
  let component: GeozoneFormComponent;
  let fixture: ComponentFixture<GeozoneFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneFormComponent],
      providers: [ConfigService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
