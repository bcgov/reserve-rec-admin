import { TestBed } from '@angular/core/testing';

import { AmplifyService } from './amplify.service';
import { ConfigService } from './config.service';
import { LogLevel } from './logger.service';
import { HttpClient, HttpHandler } from '@angular/common/http';

describe('AmplifyService', () => {
  let service: AmplifyService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpClient, HttpHandler, ConfigService]
    });
    service = TestBed.inject(AmplifyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
