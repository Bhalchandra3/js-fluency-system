import { Injectable } from '@angular/core';

/**
 * localStorage key for the user-supplied bearer token (single-user app).
 * Not a server secret at rest in source — the user pastes the value at runtime.
 */
export const AUTH_TOKEN_STORAGE_KEY = 'js-fluency.bearerToken';

/**
 * Reads/writes the bearer token used for same-origin `/api/` calls.
 * Presence of a token does not prove validity — the backend remains authoritative.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  getToken(): string | null {
    try {
      const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch {
      return null;
    }
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * @returns true when a non-empty trimmed token was stored
   */
  setToken(token: string): boolean {
    const trimmed = token.trim();
    if (trimmed.length === 0) {
      return false;
    }
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, trimmed);
      return true;
    } catch {
      return false;
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures; treat as unauthenticated.
    }
  }
}
