import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthTokenStore } from '../../core/auth/auth-token.store';
import { TokenSetupPage } from './token-setup.page';

describe('TokenSetupPage', () => {
  let fixture: ComponentFixture<TokenSetupPage>;
  let page: TokenSetupPage;
  let tokenStore: jasmine.SpyObj<AuthTokenStore>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    tokenStore = jasmine.createSpyObj<AuthTokenStore>('AuthTokenStore', [
      'hasToken',
      'setToken',
      'clearToken',
      'getToken',
    ]);
    tokenStore.hasToken.and.returnValue(false);
    tokenStore.setToken.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [TokenSetupPage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthTokenStore, useValue: tokenStore },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TokenSetupPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('rejects blank input without saving', () => {
    page.tokenInput = '   ';
    page.saveToken();
    expect(tokenStore.setToken).not.toHaveBeenCalled();
    expect(page.statusKind()).toBe('error');
    expect(page.tokenInput).toBe('   ');
  });

  it('validates token against /api/topics before saving', () => {
    page.tokenInput = 'user-supplied-token';
    page.saveToken();

    const req = httpMock.expectOne('/api/topics');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer user-supplied-token',
    );
    req.flush({ status: 'ok', topics: [] });

    expect(tokenStore.setToken).toHaveBeenCalledWith('user-supplied-token');
    expect(page.tokenInput).toBe('');
    expect(page.statusKind()).toBe('success');
    expect(page.hasSavedToken()).toBeTrue();
  });

  it('rejects saving when server returns 401 unauthorized', () => {
    page.tokenInput = 'invalid-token';
    page.saveToken();

    const req = httpMock.expectOne('/api/topics');
    req.flush(
      { status: 'error', message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(tokenStore.setToken).not.toHaveBeenCalled();
    expect(page.statusKind()).toBe('error');
    expect(page.statusMessage()).toContain('Invalid access token');
    expect(page.hasSavedToken()).toBeFalse();
  });

  it('does not render the saved token in plaintext', () => {
    tokenStore.hasToken.and.returnValue(true);
    fixture = TestBed.createComponent(TokenSetupPage);
    page = fixture.componentInstance;
    page.tokenInput = '';
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('user-supplied-token');
    expect(text.toLowerCase()).toContain('never shown');

    const input = fixture.nativeElement.querySelector(
      '#bearer-token-input',
    ) as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.value).toBe('');
  });

  it('clears a saved token via remove action', () => {
    page.hasSavedToken.set(true);
    page.clearSavedToken();
    expect(tokenStore.clearToken).toHaveBeenCalled();
    expect(page.hasSavedToken()).toBeFalse();
    expect(page.statusKind()).toBe('success');
  });
});
