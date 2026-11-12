import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { FeatureFlagService } from './feature-flag.service';
import { LoggerService } from './logger.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let apiService: { get: jest.Mock; put: jest.Mock };

  beforeEach(() => {
    apiService = { get: jest.fn(), put: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        FeatureFlagService,
        { provide: ApiService, useValue: apiService },
        { provide: LoggerService, useValue: { debug: jest.fn(), error: jest.fn() } },
      ],
    });
    service = TestBed.inject(FeatureFlagService);
  });

  it('init requests the plain featureFlags route', async () => {
    apiService.get.mockReturnValue(of({ enablePayments: false }));

    await service.init();

    expect(apiService.get).toHaveBeenCalledTimes(1);
    expect(apiService.get.mock.calls[0]).toEqual(['featureFlags']);
    expect(service.isEnabled('enablePayments')).toBe(false);
  });

  it('getFeatureFlagsAdmin requests featureFlags/admin with no query params', async () => {
    const data = { flags: { enablePayments: true }, metadata: null, version: 3 };
    apiService.get.mockReturnValue(of({ data }));

    const result = await service.getFeatureFlagsAdmin();

    expect(apiService.get).toHaveBeenCalledTimes(1);
    expect(apiService.get.mock.calls[0]).toEqual(['featureFlags/admin']);
    expect(result).toEqual(data);
  });

  it('getFeatureFlagsAdmin passes a request error to the caller', async () => {
    apiService.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    await expect(service.getFeatureFlagsAdmin()).rejects.toMatchObject({ status: 403 });
  });
});
