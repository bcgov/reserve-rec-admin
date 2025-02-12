import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ConfigService } from './services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: ConfigService, useValue: { config: { GH_HASH: 'testing' } }
        },
        [
          {
            provide: ActivatedRoute,
            useValue: {}
          }
        ],
        provideAnimations(), // required animations providers
        provideToastr(), // Toastr providers
        provideHttpClient(),
        provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'reserve-rec-admin' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('reserve-rec-admin');
  });
});
