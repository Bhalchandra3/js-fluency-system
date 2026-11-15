import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let doc: Document;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    doc = TestBed.inject(DOCUMENT);
    doc.documentElement.removeAttribute('data-theme');
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    doc.documentElement.removeAttribute('data-theme');
  });

  it('defaults to system theme when no localStorage value is set', () => {
    expect(service.theme()).toBe('system');
  });

  it('cycles through system -> dark -> light -> system on toggleNext()', () => {
    service.setTheme('system');
    expect(service.theme()).toBe('system');

    service.toggleNext();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    service.toggleNext();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    service.toggleNext();
    expect(service.theme()).toBe('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('applies data-theme attribute on documentElement when theme is explicitly set', () => {
    TestBed.flushEffects();

    service.setTheme('dark');
    TestBed.flushEffects();
    expect(doc.documentElement.getAttribute('data-theme')).toBe('dark');

    service.setTheme('light');
    TestBed.flushEffects();
    expect(doc.documentElement.getAttribute('data-theme')).toBe('light');

    service.setTheme('system');
    TestBed.flushEffects();
    expect(doc.documentElement.hasAttribute('data-theme')).toBeFalse();
  });

  it('computes effectiveTheme based on system preference when theme is system', () => {
    service.setTheme('system');
    service.systemIsDark.set(false);
    expect(service.effectiveTheme()).toBe('light');

    service.systemIsDark.set(true);
    expect(service.effectiveTheme()).toBe('dark');

    service.setTheme('light');
    expect(service.effectiveTheme()).toBe('light');
  });
});
