import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type AppTheme = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'js_fluency_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private mediaQueryList: MediaQueryList | null = null;

  readonly theme = signal<AppTheme>(this.readInitialTheme());
  readonly systemIsDark = signal<boolean>(this.readSystemDarkPreference());

  readonly effectiveTheme = computed<'light' | 'dark'>(() => {
    const t = this.theme();
    if (t === 'system') {
      return this.systemIsDark() ? 'dark' : 'light';
    }
    return t;
  });

  constructor() {
    this.initMediaQueryListener();

    effect(() => {
      const currentTheme = this.theme();
      const root = this.document?.documentElement;
      if (!root) {
        return;
      }
      if (currentTheme === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', currentTheme);
      }
    });
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    this.saveTheme(theme);
  }

  toggleNext(): void {
    const current = this.theme();
    let next: AppTheme;
    if (current === 'system') {
      next = 'dark';
    } else if (current === 'dark') {
      next = 'light';
    } else {
      next = 'system';
    }
    this.setTheme(next);
  }

  private readInitialTheme(): AppTheme {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored;
        }
      }
    } catch {
      // Storage access blocked or restricted
    }
    return 'system';
  }

  private readSystemDarkPreference(): boolean {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch {
      // matchMedia unavailable
    }
    return false;
  }

  private initMediaQueryListener(): void {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (event: MediaQueryListEvent) => {
          this.systemIsDark.set(event.matches);
        };
        if (this.mediaQueryList.addEventListener) {
          this.mediaQueryList.addEventListener('change', listener);
        } else if ('addListener' in this.mediaQueryList) {
          // Compatibility for older WebKit implementations
          (this.mediaQueryList as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(listener);
        }
      }
    } catch {
      // matchMedia listener unavailable
    }
  }

  private saveTheme(theme: AppTheme): void {
    try {
      if (typeof localStorage !== 'undefined') {
        if (theme === 'system') {
          localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
      }
    } catch {
      // Storage write failed
    }
  }
}
