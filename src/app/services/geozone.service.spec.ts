import { TestBed } from '@angular/core/testing';

import { GeozoneService } from './geozone.service';
import { ConfigService } from './config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('GeozoneService', () => {
  let service: GeozoneService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GeozoneService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
