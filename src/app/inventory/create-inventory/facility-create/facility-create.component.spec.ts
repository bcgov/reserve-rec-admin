import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCreateComponent } from './facility-create.component';
import { ConfigService } from '../../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';

describe('FacilityCreateComponent', () => {
  let component: FacilityCreateComponent;
  let fixture: ComponentFixture<FacilityCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityCreateComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([])
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(FacilityCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
