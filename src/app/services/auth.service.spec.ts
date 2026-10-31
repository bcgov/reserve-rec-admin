import { fetchAuthSession } from 'aws-amplify/auth';
import { AuthService } from './auth.service';

jest.mock('aws-amplify', () => ({ Amplify: { configure: jest.fn() } }));
jest.mock('aws-amplify/utils', () => ({ Hub: { listen: jest.fn() } }));
jest.mock('aws-amplify/auth', () => ({
  signInWithRedirect: jest.fn(),
  fetchUserAttributes: jest.fn(),
  fetchAuthSession: jest.fn(),
  signOut: jest.fn(),
}));

/*
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
*/

xdescribe('auth.service legacy placeholder', () => {
  it('skipped', () => {});
});

describe('AuthService token renewal', () => {
  const mockFetch = fetchAuthSession as jest.Mock;
  let service: AuthService;

  const sessionExpiringIn = (ms: number) => ({
    tokens: {
      accessToken: { payload: { exp: (Date.now() + ms) / 1000 }, toString: () => 'jwt' },
      refreshToken: { payload: { exp: (Date.now() + 86_400_000) / 1000 } },
    },
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    service = new AuthService(
      { config: {} } as any,
      { debug: jest.fn(), info: jest.fn(), error: jest.fn() } as any,
      { navigate: jest.fn() } as any,
      { load: jest.fn(), clear: jest.fn() } as any
    );
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does not renew a token with plenty of time left', async () => {
    service.session.set(sessionExpiringIn(30 * 60_000));
    await service.ensureFreshToken();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renews an expired token', async () => {
    service.session.set(sessionExpiringIn(-1000));
    mockFetch.mockResolvedValue(sessionExpiringIn(60 * 60_000));
    await service.ensureFreshToken();
    expect(mockFetch).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('renews a token about to expire', async () => {
    service.session.set(sessionExpiringIn(30_000));
    mockFetch.mockResolvedValue(sessionExpiringIn(60 * 60_000));
    await service.ensureFreshToken();
    expect(mockFetch).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('does nothing when signed out', async () => {
    await service.ensureFreshToken();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not renew while offline, so the user is not logged out', async () => {
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    service.session.set(sessionExpiringIn(-1000));
    await service.ensureFreshToken();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('leaves one pending refresh timer after overlapping renewals', async () => {
    mockFetch.mockResolvedValue(sessionExpiringIn(60 * 60_000));
    await Promise.all([service.setRefresh(true), service.setRefresh(true)]);
    expect(jest.getTimerCount()).toBe(1);
  });
});
