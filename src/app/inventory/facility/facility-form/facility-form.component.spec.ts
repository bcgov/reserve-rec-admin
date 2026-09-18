import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityFormComponent } from './facility-form.component';
import { ConfigService } from '../../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';

describe('FacilityFormComponent duplicate display name (#392)', () => {
  let component: FacilityFormComponent;
  let fixture: ComponentFixture<FacilityFormComponent>;

  // The validator sits on the form group, so the error lands on form.errors,
  // not on the displayName control.
  function setName(name: string) {
    component.form.get('displayName').setValue(name);
    component.form.updateValueAndValidity();
    return component.form.errors || {};
  }

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
    component['siblingFacilityNames'] = new Set(['cheakamus', 'diamond head']);
  });

  it('flags a name already used in the park, ignoring case and padding', () => {
    expect(setName('Cheakamus').duplicateDisplayName).toBe(true);
    expect(setName('  CHEAKAMUS  ').duplicateDisplayName).toBe(true);
  });

  it('allows a name not used in the park', () => {
    expect(setName('Cheakamus North').duplicateDisplayName).toBeUndefined();
  });

  it('allows a facility to keep its own name while editing', () => {
    component.facility = { facilityId: 1, displayName: 'Cheakamus' };
    expect(setName('Cheakamus').duplicateDisplayName).toBeUndefined();
  });

  it('blocks submit when the sibling names could not be loaded', () => {
    component['siblingFacilityNames'] = null;
    expect(setName('Cheakamus North').displayNameCheckUnavailable).toBe(true);
    expect(component.form.valid).toBe(false);
  });
});
