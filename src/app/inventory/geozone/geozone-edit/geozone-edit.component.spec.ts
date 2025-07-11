import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneEditComponent } from './geozone-edit.component';
import { ConfigService } from '../../../services/config.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('GeozoneEditComponent', () => {
  let component: GeozoneEditComponent;
  let fixture: ComponentFixture<GeozoneEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneEditComponent],
      providers: [ConfigService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
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
