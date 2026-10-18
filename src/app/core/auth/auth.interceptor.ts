import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthTokenStore } from './auth-token.store';

export const TOKEN_SETUP_PATH = '/setup';

/**
 * Same-origin application API paths that may receive the bearer token.
 */
export function isAppApiRequest(url: string): boolean {
  try {
    if (url.startsWith('/api/') || url === '/api') {
      return true;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        return false;
      }
      return parsed.pathname === '/api' || parsed.pathname.startsWith('/api/');
    }
    // Absolute URL without window (tests): treat only path-style /api/ as in-app.
    if (/^https?:\/\//i.test(url)) {
      return false;
    }
    return url.startsWith('api/') || url.startsWith('/api/');
  } catch {
    return false;
  }
}

/**
 * Attaches `Authorization: Bearer <token>` to same-origin `/api/` requests.
 * On authenticated 401, clears the stored token and navigates to setup once.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStore = inject(AuthTokenStore);
  const router = inject(Router);

  let outgoing = req;
  let sentWithAuth = false;

  if (isAppApiRequest(req.url)) {
    const token = tokenStore.getToken();
    if (token) {
      outgoing = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      sentWithAuth = true;
    }
  }

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        sentWithAuth
      ) {
        tokenStore.clearToken();
        const onSetup = router.url.split('?')[0] === TOKEN_SETUP_PATH;
        if (!onSetup) {
          void router.navigateByUrl(TOKEN_SETUP_PATH, { replaceUrl: true });
        }
      }
      return throwError(() => error);
    }),
  );
};
