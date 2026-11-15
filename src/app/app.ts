import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthTokenStore } from './core/auth/auth-token.store';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly tokenStore = inject(AuthTokenStore);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  disconnect(): void {
    this.tokenStore.clearToken();
    void this.router.navigateByUrl('/setup');
  }

  toggleTheme(): void {
    this.themeService.toggleNext();
  }

  themeButtonLabel(): string {
    const current = this.themeService.theme();
    const effective = this.themeService.effectiveTheme();
    if (current === 'system') {
      return `Theme: Auto (${effective})`;
    }
    return current === 'dark' ? 'Theme: Dark' : 'Theme: Light';
  }

  themeIcon(): string {
    const current = this.themeService.theme();
    if (current === 'system') {
      return '💻';
    }
    return current === 'dark' ? '🌙' : '☀️';
  }
}
