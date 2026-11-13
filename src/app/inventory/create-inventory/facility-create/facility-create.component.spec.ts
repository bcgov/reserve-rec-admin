import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { UntypedFormGroup } from '@angular/forms';

import { FacilityCreateComponent } from './facility-create.component';
import { FacilityFormComponent } from '../../facility/facility-form/facility-form.component';
import { ConfigService } from '../../../services/config.service';
import { FacilityService } from '../../../services/facility.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';

describe('FacilityCreateComponent ORCS', () => {
  let component: FacilityCreateComponent;
  let fixture: ComponentFixture<FacilityCreateComponent>;
  let form: UntypedFormGroup;
  let createFacility: jest.SpyInstance;

  async function submitWithOrcs(orcs) {
    form.get('orcs').setValue(orcs);
    form.get('orcs').markAsDirty();
    await component.submit();
    expect(createFacility).toHaveBeenCalledTimes(1);
    return createFacility.mock.calls[0][2];
  }

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
      // The form's real controls build the body; its inputs need bootstrap's JS, which jsdom lacks.
      .overrideComponent(FacilityFormComponent, { set: { template: '' } })
      .compileComponents();

    const facilityService = TestBed.inject(FacilityService);
    jest.spyOn(facilityService, 'getFacilitiesByCollectionId').mockResolvedValue({ items: [] });
    createFacility = jest.spyOn(facilityService, 'createFacility').mockResolvedValue([]);

    fixture = TestBed.createComponent(FacilityCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    form = fixture.debugElement.query(By.directive(FacilityFormComponent)).componentInstance.form;
    form.patchValue({
      collectionId: 'bcparks_1',
      facilityType: 'campground',
      displayName: 'Cheakamus',
      location: { latitude: 50, longitude: -123 }
    });
    await fixture.whenStable();
  });

  it('sends an entered ORCS as a number', async () => {
    const body = await submitWithOrcs('12');
    expect(body.orcs).toBe(12);
  });

  it('sends no orcs when the field is left empty', async () => {
    const body = await submitWithOrcs(null);
    expect(body).not.toHaveProperty('orcs');
  });
});
