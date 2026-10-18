import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthTokenStore } from './auth-token.store';
import { requireTokenGuard } from './require-token.guard';

describe('requireTokenGuard', () => {
  let tokenStore: jasmine.SpyObj<AuthTokenStore>;

  beforeEach(() => {
    tokenStore = jasmine.createSpyObj<AuthTokenStore>('AuthTokenStore', ['hasToken']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthTokenStore, useValue: tokenStore },
      ],
    });
  });

  it('allows activation when a token is present', () => {
    tokenStore.hasToken.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => requireTokenGuard({} as never, {} as never));
    expect(result).toBeTrue();
  });

  it('redirects to /setup when no token is present', () => {
    tokenStore.hasToken.and.returnValue(false);
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => requireTokenGuard({} as never, {} as never));
    expect(result).toEqual(router.createUrlTree(['/setup']));
  });
});
