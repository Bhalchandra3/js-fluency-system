import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthTokenStore } from '../../core/auth/auth-token.store';

@Component({
  selector: 'app-token-setup-page',
  imports: [FormsModule],
  templateUrl: './token-setup.page.html',
  styleUrl: './token-setup.page.scss',
})
export class TokenSetupPage {
  private readonly tokenStore = inject(AuthTokenStore);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /** Bound to the password input; cleared after a successful save. */
  tokenInput = '';

  readonly hasSavedToken = signal(this.tokenStore.hasToken());
  readonly statusMessage = signal<string | null>(null);
  readonly statusKind = signal<'success' | 'error' | null>(null);
  readonly validating = signal(false);

  saveToken(): void {
    if (this.validating()) {
      return;
    }

    this.statusMessage.set(null);
    this.statusKind.set(null);

    const value = this.tokenInput.trim();
    if (value.length === 0) {
      this.statusKind.set('error');
      this.statusMessage.set('Enter a non-empty access token.');
      return;
    }

    this.validating.set(true);
    this.statusMessage.set('Validating token with server...');

    const headers = new HttpHeaders({ Authorization: `Bearer ${value}` });
    this.http.get('/api/topics', { headers }).subscribe({
      next: () => {
        this.validating.set(false);
        const saved = this.tokenStore.setToken(value);
        this.tokenInput = '';

        if (!saved) {
          this.statusKind.set('error');
          this.statusMessage.set(
            'Could not save the token in this browser. Check storage permissions and try again.',
          );
          this.hasSavedToken.set(this.tokenStore.hasToken());
          return;
        }

        this.hasSavedToken.set(true);
        this.statusKind.set('success');
        this.statusMessage.set(
          'Access token verified and saved! Redirecting to dashboard...',
        );

        setTimeout(() => {
          void this.router.navigateByUrl('/dashboard');
        }, 800);
      },
      error: (error: { status?: number }) => {
        this.validating.set(false);
        this.statusKind.set('error');
        if (error && error.status === 401) {
          this.statusMessage.set(
            'Invalid access token. Please check the BEARER_TOKEN configured on your server.',
          );
        } else {
          this.statusMessage.set(
            'Could not verify token. Server may be unavailable. Check connection and try again.',
          );
        }
      },
    });
  }

  clearSavedToken(): void {
    this.tokenStore.clearToken();
    this.tokenInput = '';
    this.hasSavedToken.set(false);
    this.statusKind.set('success');
    this.statusMessage.set('Saved access token removed from this browser.');
  }
}
