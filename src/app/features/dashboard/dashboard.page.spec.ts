import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';import { NEVER, of, throwError } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import {
  emptyTodayRevisionFixture,
  todayRevisionFixture,
} from '../../core/api/fixtures/revision-contracts';
import { RevisionApiService } from '../../core/api/revision-api.service';
import { AuthTokenStore } from '../../core/auth/auth-token.store';
import { requireTokenGuard } from '../../core/auth/require-token.guard';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let page: DashboardPage;
  let api: jasmine.SpyObj<RevisionApiService>;

  function createPage(
    todayImpl: () => ReturnType<RevisionApiService['getToday']>,
  ): void {
    api = jasmine.createSpyObj<RevisionApiService>('RevisionApiService', [
      'getToday',
      'submitAnswer',
      'completeSession',
    ]);
    api.getToday.and.callFake(todayImpl);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '', component: DashboardPage }]),
        { provide: RevisionApiService, useValue: api },
      ],
    });

    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows a loading state while getToday is in flight', () => {
    api = jasmine.createSpyObj<RevisionApiService>('RevisionApiService', [
      'getToday',
      'submitAnswer',
      'completeSession',
    ]);
    api.getToday.and.returnValue(NEVER);

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RevisionApiService, useValue: api },
      ],
    });
    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.componentInstance;
    expect(page.viewState()).toBe('loading');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading dashboard');
  });

  it('renders due and overdue counts from the today API', () => {
    createPage(() => of(todayRevisionFixture));
    expect(page.viewState()).toBe('ready');
    expect(page.dueCount()).toBe(2);
    expect(page.overdueCount()).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Due topics');
    expect(text).toContain('Overdue topics');
    expect(text).toContain('Closures');
    expect(text).toContain('0 / 2');
    expect(text).toContain('Overdue');
  });

  it('renders the empty-session state without fabricating statistics', () => {
    createPage(() => of(emptyTodayRevisionFixture));
    expect(page.viewState()).toBe('ready');
    expect(page.session()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No open revision session');
    expect(text).toContain('Nothing is due right now');
    expect(text).not.toContain('streak');
    expect(text).not.toContain('leaderboard');
    expect(text).not.toContain('Deep Dive');
    expect(text).not.toContain('60%');
  });

  it('explains due topics when counts exist without an open session', () => {
    createPage(() =>
      of({
        status: 'ok' as const,
        dueCount: 3,
        overdueCount: 1,
        session: null,
      }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No open revision session');
    expect(text).toContain('3');
    expect(text).toContain('overdue');
    expect(text).not.toContain('Closures');
  });

  it('surfaces load failures without staying stuck loading', () => {
    createPage(() =>
      throwError(
        () =>
          new ApiClientError({
            statusCode: 500,
            message: 'A server error occurred. Please try again later.',
            fromBackend: false,
          }),
      ),
    );
    expect(page.viewState()).toBe('error');
    expect(page.pageError()).toContain('server error');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load dashboard');
    expect(text).toContain('Retry');
  });

  it('retries loading when Retry is clicked', () => {
    createPage(() =>
      throwError(
        () =>
          new ApiClientError({
            statusCode: 500,
            message: 'temporary failure',
            fromBackend: true,
          }),
      ),
    );
    expect(api.getToday.calls.count()).toBe(1);
    api.getToday.and.returnValue(of(todayRevisionFixture));
    const retry = fixture.nativeElement.querySelector(
      'button.dashboard__btn--primary',
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    expect(api.getToday.calls.count()).toBe(2);
    expect(page.viewState()).toBe('ready');
  });

  it('provides navigation to Today’s Revision', () => {
    createPage(() => of(todayRevisionFixture));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Continue Today’s Revision');
    const cta = Array.from(
      fixture.nativeElement.querySelectorAll('a[routerlink], a[href]'),
    ) as HTMLAnchorElement[];
    const todayLinks = cta.filter((anchor) => {
      const href = anchor.getAttribute('href') ?? '';
      const routerLink = anchor.getAttribute('routerlink') ?? '';
      return href === '/' || routerLink === '/';
    });
    expect(todayLinks.length).toBeGreaterThan(0);
  });

  it('calls getToday once on load (no redundant dashboard API)', () => {
    createPage(() => of(todayRevisionFixture));
    expect(api.getToday).toHaveBeenCalledTimes(1);
    expect(api.submitAnswer).not.toHaveBeenCalled();
    expect(api.completeSession).not.toHaveBeenCalled();
  });
});

describe('DashboardPage route guard integration', () => {
  it('redirects /dashboard to /setup when no token is present', async () => {
    const tokenStore = jasmine.createSpyObj<AuthTokenStore>('AuthTokenStore', [
      'hasToken',
    ]);
    tokenStore.hasToken.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'setup', component: DashboardPage },
          {
            path: 'dashboard',
            component: DashboardPage,
            canActivate: [requireTokenGuard],
          },
        ]),
        { provide: AuthTokenStore, useValue: tokenStore },
        {
          provide: RevisionApiService,
          useValue: jasmine.createSpyObj<RevisionApiService>(
            'RevisionApiService',
            ['getToday'],
          ),
        },
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    expect(router.url).toBe('/setup');
  });

  it('allows /dashboard when a token is present', async () => {
    const tokenStore = jasmine.createSpyObj<AuthTokenStore>('AuthTokenStore', [
      'hasToken',
    ]);
    tokenStore.hasToken.and.returnValue(true);
    const api = jasmine.createSpyObj<RevisionApiService>('RevisionApiService', [
      'getToday',
    ]);
    api.getToday.and.returnValue(of(emptyTodayRevisionFixture));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          {
            path: 'dashboard',
            component: DashboardPage,
            canActivate: [requireTokenGuard],
          },
        ]),
        { provide: AuthTokenStore, useValue: tokenStore },
        { provide: RevisionApiService, useValue: api },
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    expect(router.url).toBe('/dashboard');
  });
});
