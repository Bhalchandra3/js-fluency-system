import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';
import { AuthTokenStore } from './core/auth/auth-token.store';

describe('App', () => {
  let tokenStore: AuthTokenStore;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    tokenStore = TestBed.inject(AuthTokenStore);
    router = TestBed.inject(Router);
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render primary navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('JavaScript Fluency');
    expect(compiled.textContent).toContain("Today's Revision");
    expect(compiled.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Mistakes');
    expect(compiled.textContent).toContain('Deep Dive');
    expect(compiled.textContent).toContain('Access token');
  });

  it('should disconnect and clear token when disconnect is invoked', () => {
    spyOn(tokenStore, 'clearToken');
    spyOn(router, 'navigateByUrl');

    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.disconnect();

    expect(tokenStore.clearToken).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/setup');
  });
});
