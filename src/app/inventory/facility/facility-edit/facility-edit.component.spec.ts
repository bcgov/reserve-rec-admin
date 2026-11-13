import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';

import { FacilityEditComponent } from './facility-edit.component';
import { FacilityFormComponent } from '../facility-form/facility-form.component';
import { ConfigService } from '../../../services/config.service';
import { FacilityService } from '../../../services/facility.service';

describe('FacilityEditComponent ORCS', () => {
  const stored = {
    collectionId: 'bcparks_1',
    facilityType: 'campground',
    facilityId: 1,
    displayName: 'Cheakamus',
    location: { type: 'point', coordinates: [-123, 50] },
  };
  let updateFacility: jest.SpyInstance;

  // Renders the edit page for a stored facility, edits ORCS and returns the PUT body.
  async function saveWithOrcs(facility, orcs) {
    await TestBed.configureTestingModule({
      imports: [FacilityEditComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { data: of({}), snapshot: { data: {} }, parent: { snapshot: { data: { facility } } } }
        }
      ]
    })
      // The form's real controls build the body; its inputs need bootstrap's JS, which jsdom lacks.
      .overrideComponent(FacilityFormComponent, { set: { template: '' } })
      .compileComponents();

    const facilityService = TestBed.inject(FacilityService);
    jest.spyOn(facilityService, 'getFacilitiesByCollectionId').mockResolvedValue({ items: [] });
    updateFacility = jest.spyOn(facilityService, 'updateFacility').mockResolvedValue(null);

    const fixture = TestBed.createComponent(FacilityEditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(FacilityFormComponent)).componentInstance.form;
    form.get('orcs').setValue(orcs);
    form.get('orcs').markAsDirty();

    await fixture.componentInstance.submit();
    expect(updateFacility).toHaveBeenCalledTimes(1);
    return updateFacility.mock.calls[0][3];
  }

  it('sends a changed ORCS as a number', async () => {
    const body = await saveWithOrcs({ ...stored, orcs: 12 }, '34');
    expect(body.orcs).toBe(34);
  });

  it('sends the remove action when a stored ORCS is cleared', async () => {
    const body = await saveWithOrcs({ ...stored, orcs: 12 }, null);
    expect(body.orcs).toEqual({ value: null, action: 'remove' });
  });

  it('sends no orcs when the field is cleared and none was stored', async () => {
    const body = await saveWithOrcs(stored, '');
    expect(body).not.toHaveProperty('orcs');
  });
});
