import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityFormComponent } from './facility-form.component';
import { ConfigService } from '../../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';

describe('FacilityFormComponent', () => {
  let component: FacilityFormComponent;
  let fixture: ComponentFixture<FacilityFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityFormComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
