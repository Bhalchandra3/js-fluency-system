import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthTokenStore } from '../../core/auth/auth-token.store';

@Component({
  selector: 'app-token-setup-page',
  imports: [FormsModule],
  templateUrl: './token-setup.page.html',
  styleUrl: './token-setup.page.scss',
})
export class TokenSetupPage {
  private readonly tokenStore = inject(AuthTokenStore);

  /** Bound to the password input; cleared after a successful save. */
  tokenInput = '';

  readonly hasSavedToken = signal(this.tokenStore.hasToken());
  readonly statusMessage = signal<string | null>(null);
  readonly statusKind = signal<'success' | 'error' | null>(null);

  saveToken(): void {
    this.statusMessage.set(null);
    this.statusKind.set(null);

    const value = this.tokenInput;
    if (value.trim().length === 0) {
      this.statusKind.set('error');
      this.statusMessage.set('Enter a non-empty access token.');
      return;
    }

    const saved = this.tokenStore.setToken(value);
    // Clear the input so the token is not left visible in the form control.
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
      this.hasSavedToken()
        ? 'Access token saved. You can replace it anytime by saving a new value.'
        : 'Access token saved.',
    );
  }

  clearSavedToken(): void {
    this.tokenStore.clearToken();
    this.tokenInput = '';
    this.hasSavedToken.set(false);
    this.statusKind.set('success');
    this.statusMessage.set('Saved access token removed from this browser.');
  }
}
