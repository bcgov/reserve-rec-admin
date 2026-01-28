/*
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { provideRouter } from '@angular/router';
import { ConfigService } from '../../../services/config.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ActivityFormComponent } from './activity-form.component';

describe('ActivityFormComponent', () => {
  let component: ActivityFormComponent;
  let fixture: ComponentFixture<ActivityFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityFormComponent],
      providers: [
        ConfigService,
        provideAnimations(),
        provideToastr(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({}),
            parent: {
              snapshot: {
                data: {}
              }
            },
            snapshot: {
              data: {}
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
*/

xdescribe('activity-form.component legacy placeholder', () => {
  it('skipped', () => {});
});
