import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneComponent } from './geozone.component';
import { ConfigService } from '../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';

describe('GeozoneComponent', () => {
  let component: GeozoneComponent;
  let fixture: ComponentFixture<GeozoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideToastr()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
