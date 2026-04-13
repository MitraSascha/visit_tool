import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

const ACCESS_KEY  = 'cv_access_token';
const REFRESH_KEY = 'cv_refresh_token';

/** Builds a minimal non-expired JWT payload encoded as a real JWT string */
function buildJwt(payload: Record<string, unknown>): string {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

function validToken(sub = '1', email = 'test@test.de'): string {
  return buildJwt({ sub, email, exp: Math.floor(Date.now() / 1000) + 3600 });
}

function expiredToken(): string {
  return buildJwt({ sub: '1', email: 'old@test.de', exp: 1 }); // exp in the past
}

const MOCK_TOKENS: TokenResponse = {
  access_token:  validToken(),
  refresh_token: buildJwt({ sub: '1', exp: Math.floor(Date.now() / 1000) + 86400 }),
  token_type:    'bearer',
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service  = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ── should create ────────────────────────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  // ── initial state ────────────────────────────────────────────────────────

  it('starts as not logged in when localStorage is empty', () => {
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.user()).toBeNull();
  });

  it('restores session from valid token in localStorage', () => {
    localStorage.setItem(ACCESS_KEY, validToken('42', 'restored@test.de'));
    // Re-create service so constructor picks up the stored token
    const freshService = TestBed.runInInjectionContext(() => new AuthService());
    expect(freshService.isLoggedIn()).toBeTrue();
    expect(freshService.user()?.email).toBe('restored@test.de');
  });

  it('does NOT restore session from expired token in localStorage', () => {
    localStorage.setItem(ACCESS_KEY, expiredToken());
    const freshService = TestBed.runInInjectionContext(() => new AuthService());
    expect(freshService.isLoggedIn()).toBeFalse();
    expect(freshService.user()).toBeNull();
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('posts credentials and stores tokens', () => {
      service.login({ email: 'test@test.de', password: 'secret' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'test@test.de', password: 'secret' });

      req.flush(MOCK_TOKENS);

      expect(localStorage.getItem(ACCESS_KEY)).toBe(MOCK_TOKENS.access_token);
      expect(localStorage.getItem(REFRESH_KEY)).toBe(MOCK_TOKENS.refresh_token);
    });

    it('sets user signal after successful login', () => {
      service.login({ email: 'test@test.de', password: 'secret' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(MOCK_TOKENS);

      expect(service.isLoggedIn()).toBeTrue();
      expect(service.user()?.email).toBe('test@test.de');
    });

    it('propagates HTTP 401 error to subscriber', () => {
      let errorCaught = false;
      service.login({ email: 'bad@test.de', password: 'wrong' }).subscribe({
        error: () => (errorCaught = true),
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      expect(errorCaught).toBeTrue();
      expect(service.isLoggedIn()).toBeFalse();
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears tokens from localStorage and resets user signal', () => {
      localStorage.setItem(ACCESS_KEY,  MOCK_TOKENS.access_token);
      localStorage.setItem(REFRESH_KEY, MOCK_TOKENS.refresh_token);
      // Force signal update by logging in first via flush
      service.login({ email: 'test@test.de', password: 'x' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(MOCK_TOKENS);

      service.logout();

      expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
      expect(service.isLoggedIn()).toBeFalse();
      expect(service.user()).toBeNull();
    });
  });

  // ── getAccessToken / getRefreshToken ─────────────────────────────────────

  describe('getAccessToken / getRefreshToken', () => {
    it('returns null when no token is stored', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it('returns stored tokens', () => {
      localStorage.setItem(ACCESS_KEY,  'access-123');
      localStorage.setItem(REFRESH_KEY, 'refresh-456');
      expect(service.getAccessToken()).toBe('access-123');
      expect(service.getRefreshToken()).toBe('refresh-456');
    });
  });

  // ── isTokenExpired ───────────────────────────────────────────────────────

  describe('isTokenExpired', () => {
    it('returns true when no token is stored', () => {
      expect(service.isTokenExpired()).toBeTrue();
    });

    it('returns false for a valid non-expired token', () => {
      localStorage.setItem(ACCESS_KEY, validToken());
      expect(service.isTokenExpired()).toBeFalse();
    });

    it('returns true for an expired token', () => {
      localStorage.setItem(ACCESS_KEY, expiredToken());
      expect(service.isTokenExpired()).toBeTrue();
    });

    it('returns true for a malformed (non-JWT) token', () => {
      localStorage.setItem(ACCESS_KEY, 'not-a-jwt');
      expect(service.isTokenExpired()).toBeTrue();
    });
  });

  // ── refreshTokens ────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('posts refresh token and updates stored tokens', () => {
      localStorage.setItem(REFRESH_KEY, 'old-refresh');
      const newTokens: TokenResponse = {
        access_token:  validToken('1', 'test@test.de'),
        refresh_token: buildJwt({ sub: '1', exp: Math.floor(Date.now() / 1000) + 86400 }),
        token_type:    'bearer',
      };

      service.refreshTokens().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refresh_token: 'old-refresh' });

      req.flush(newTokens);

      expect(localStorage.getItem(ACCESS_KEY)).toBe(newTokens.access_token);
      expect(localStorage.getItem(REFRESH_KEY)).toBe(newTokens.refresh_token);
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('propagates HTTP error during refresh', () => {
      let errorCaught = false;
      service.refreshTokens().subscribe({ error: () => (errorCaught = true) });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      expect(errorCaught).toBeTrue();
    });
  });
});
