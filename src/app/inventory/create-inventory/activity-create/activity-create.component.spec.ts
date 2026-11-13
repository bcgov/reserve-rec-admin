import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';

import { ActivityCreateComponent } from './activity-create.component';
import { ActivityFormComponent } from '../../activity/activity-form/activity-form.component';
import { ActivityService } from '../../../services/activity.service';
import { ConfigService } from '../../../services/config.service';

describe('ActivityCreateComponent request body', () => {
  it('never sends facilities or geozones', async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityCreateComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: of({}), snapshot: { data: {} } } }
      ]
    })
      // The form's real controls build the body; its inputs need bootstrap's JS, which jsdom lacks.
      .overrideComponent(ActivityFormComponent, { set: { template: '' } })
      .compileComponents();
    const createActivity = jest.spyOn(TestBed.inject(ActivityService), 'createActivity').mockResolvedValue([]);

    const fixture = TestBed.createComponent(ActivityCreateComponent);
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(ActivityFormComponent)).componentInstance.form;
    form.patchValue({ collectionId: 'bcparks_1', activityType: 'backcountryCamp', displayName: 'Garibaldi Lake' });
    form.markAllAsDirty();
    await fixture.componentInstance.submit();

    const body = createActivity.mock.calls[0][1];
    expect(body).not.toHaveProperty('facilities');
    expect(body).not.toHaveProperty('geozones');
  });
});
