import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { ConfigService } from './config.service';
import { HttpClient, HttpHandler } from '@angular/common/http';

describe('AuthService', () => {
  let service: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HttpClient, HttpHandler, ConfigService]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
