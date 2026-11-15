import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthTokenStore } from './core/auth/auth-token.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly tokenStore = inject(AuthTokenStore);
  private readonly router = inject(Router);

  disconnect(): void {
    this.tokenStore.clearToken();
    void this.router.navigateByUrl('/setup');
  }
}
