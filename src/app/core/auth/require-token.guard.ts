import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthTokenStore } from './auth-token.store';

/**
 * Sends users without a locally saved token to `/setup`.
 * Backend remains authoritative for token validity.
 */
export const requireTokenGuard: CanActivateFn = () => {
  const tokenStore = inject(AuthTokenStore);
  const router = inject(Router);

  if (tokenStore.hasToken()) {
    return true;
  }

  return router.createUrlTree(['/setup']);
};
