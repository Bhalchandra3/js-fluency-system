import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthTokenStore } from './auth-token.store';
import { authInterceptor, isAppApiRequest, TOKEN_SETUP_PATH } from './auth.interceptor';

describe('isAppApiRequest', () => {
  it('classifies same-origin /api/ paths', () => {
    expect(isAppApiRequest('/api/revision/today')).toBeTrue();
    expect(isAppApiRequest('/api')).toBeTrue();
    expect(isAppApiRequest('/setup')).toBeFalse();
    expect(isAppApiRequest('https://evil.example/api/revision/today')).toBeFalse();
  });
});

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStore: AuthTokenStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'setup', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthTokenStore,
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStore = TestBed.inject(AuthTokenStore);
    router = TestBed.inject(Router);

    spyOn(tokenStore, 'getToken').and.returnValue(null);
    spyOn(tokenStore, 'clearToken');
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds the Bearer header to /api/ requests when a token exists', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue('test-token');

    http.get('/api/revision/today').subscribe();
    const req = httpMock.expectOne('/api/revision/today');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({ status: 'ok' });
  });

  it('does not attach the token to external URLs', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue('test-token');

    http.get('https://example.com/api/data').subscribe();
    const req = httpMock.expectOne('https://example.com/api/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does not attach the token to unrelated paths', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue('test-token');

    http.get('/assets/config.json').subscribe();
    const req = httpMock.expectOne('/assets/config.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('passes /api/ requests without Authorization when no token exists', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue(null);

    http.get('/api/revision/today').subscribe({
      error: () => undefined,
    });
    const req = httpMock.expectOne('/api/revision/today');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ status: 'error', message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    expect(tokenStore.clearToken).not.toHaveBeenCalled();
  });

  it('clears the stored token and navigates on authenticated 401', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue('test-token');
    Object.defineProperty(router, 'url', { get: () => '/' });

    http.get('/api/revision/today').subscribe({
      error: () => undefined,
    });
    const req = httpMock.expectOne('/api/revision/today');
    req.flush(
      { status: 'error', message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(tokenStore.clearToken).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith(TOKEN_SETUP_PATH, {
      replaceUrl: true,
    });
  });

  it('does not clear the token for non-401 failures', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue('test-token');

    http.get('/api/revision/today').subscribe({
      error: () => undefined,
    });
    const req = httpMock.expectOne('/api/revision/today');
    req.flush(
      { status: 'error', message: 'conflict' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(tokenStore.clearToken).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not re-navigate when already on the setup path', () => {
    (tokenStore.getToken as jasmine.Spy).and.returnValue('test-token');
    Object.defineProperty(router, 'url', { get: () => TOKEN_SETUP_PATH });

    http.get('/api/topics').subscribe({
      error: () => undefined,
    });
    const req = httpMock.expectOne('/api/topics');
    req.flush(
      { status: 'error', message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(tokenStore.clearToken).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
