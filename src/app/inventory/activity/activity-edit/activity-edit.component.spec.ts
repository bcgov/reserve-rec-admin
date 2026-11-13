import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';

import { ActivityEditComponent } from './activity-edit.component';
import { ActivityFormComponent } from '../activity-form/activity-form.component';
import { ActivityService } from '../../../services/activity.service';
import { ConfigService } from '../../../services/config.service';
import { RelationshipService } from '../../../services/relationship.service';

describe('ActivityEditComponent save', () => {
  const activity = {
    pk: 'activity::bcparks_1',
    sk: 'backcountryCamp::1',
    collectionId: 'bcparks_1',
    activityType: 'backcountryCamp',
    activityId: 1,
    displayName: 'Garibaldi Lake',
    facilities: [{ pk: 'facility::bcparks_1', sk: 'campground::1' }],
  };
  let updateActivity: jest.SpyInstance;
  let syncRelationships: jest.SpyInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityEditComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { data: of({}), snapshot: { data: {} }, parent: { snapshot: { data: { activity } } } }
        }
      ]
    })
      // The form's real controls build the body; its inputs need bootstrap's JS, which jsdom lacks.
      .overrideComponent(ActivityFormComponent, { set: { template: '' } })
      .compileComponents();
    updateActivity = jest.spyOn(TestBed.inject(ActivityService), 'updateActivity').mockResolvedValue({});
    syncRelationships = jest.spyOn(TestBed.inject(RelationshipService), 'syncRelationships');
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ActivityEditComponent);
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(ActivityFormComponent)).componentInstance.form;
    form.patchValue({ displayName: 'Garibaldi Lake Camp' });
    form.markAllAsDirty();
    await fixture.componentInstance.submit();
  });

  it('never sends facilities or geozones', () => {
    const body = updateActivity.mock.calls[0][3];
    expect(body).not.toHaveProperty('facilities');
    expect(body).not.toHaveProperty('geozones');
  });

  it('leaves the facility links alone', () => {
    expect(syncRelationships).not.toHaveBeenCalled();
  });
});
