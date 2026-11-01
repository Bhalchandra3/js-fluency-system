import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import { progressSummaryFixture } from '../../core/api/fixtures/phase4-contracts';
import {
  emptyTodayRevisionFixture,
  todayRevisionFixture,
} from '../../core/api/fixtures/revision-contracts';
import { ProgressApiService } from '../../core/api/progress-api.service';
import { RevisionApiService } from '../../core/api/revision-api.service';
import { AuthTokenStore } from '../../core/auth/auth-token.store';
import { requireTokenGuard } from '../../core/auth/require-token.guard';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let page: DashboardPage;
  let revisionApi: jasmine.SpyObj<RevisionApiService>;
  let progressApi: jasmine.SpyObj<ProgressApiService>;

  function createPage(
    todayImpl: () => ReturnType<RevisionApiService['getToday']>,
    progressImpl: () => ReturnType<ProgressApiService['getProgress']> = () =>
      of(progressSummaryFixture),
  ): void {
    revisionApi = jasmine.createSpyObj<RevisionApiService>('RevisionApiService', [
      'getToday',
      'submitAnswer',
      'completeSession',
    ]);
    progressApi = jasmine.createSpyObj<ProgressApiService>('ProgressApiService', [
      'getProgress',
    ]);
    revisionApi.getToday.and.callFake(todayImpl);
    progressApi.getProgress.and.callFake(progressImpl);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: '', component: DashboardPage },
          { path: 'mistakes', component: DashboardPage },
          { path: 'deep-dive', component: DashboardPage },
        ]),
        { provide: RevisionApiService, useValue: revisionApi },
        { provide: ProgressApiService, useValue: progressApi },
      ],
    });

    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows a loading state while getToday is in flight', () => {
    revisionApi = jasmine.createSpyObj<RevisionApiService>('RevisionApiService', [
      'getToday',
    ]);
    progressApi = jasmine.createSpyObj<ProgressApiService>('ProgressApiService', [
      'getProgress',
    ]);
    revisionApi.getToday.and.returnValue(NEVER);
    progressApi.getProgress.and.returnValue(NEVER);

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RevisionApiService, useValue: revisionApi },
        { provide: ProgressApiService, useValue: progressApi },
      ],
    });
    fixture = TestBed.createComponent(DashboardPage);
    page = fixture.componentInstance;
    expect(page.viewState()).toBe('loading');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading dashboard');
  });

  it('renders due/overdue and Phase 4 progress counts', () => {
    createPage(() => of(todayRevisionFixture));
    expect(page.viewState()).toBe('ready');
    expect(page.progressState()).toBe('ready');
    expect(page.dueCount()).toBe(4);
    expect(page.overdueCount()).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Due topics');
    expect(text).toContain('Overdue topics');
    expect(text).toContain('Green topics');
    expect(text).toContain('10');
    expect(text).toContain('Yellow topics');
    expect(text).toContain('Red topics');
    expect(text).toContain('Unresolved mistakes');
    expect(text).toContain('Deep Dive queue');
    expect(text).toContain('Closures');
    expect(text).toContain('Continue Today’s Revision');
  });

  it('keeps Today’s Revision as the primary CTA', () => {
    createPage(() => of(todayRevisionFixture));
    const primary = fixture.nativeElement.querySelector(
      'a.dashboard__btn--primary',
    ) as HTMLAnchorElement | null;
    expect(primary).not.toBeNull();
    expect(primary?.textContent).toContain('Today’s Revision');
    const href = primary?.getAttribute('href') ?? primary?.getAttribute('routerlink') ?? '';
    expect(href === '/' || href === '').toBeTrue();
  });

  it('links to Mistake Log and Deep Dive Queue with counts', () => {
    createPage(() => of(todayRevisionFixture));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Open Mistake Log');
    expect(text).toContain('3 unresolved');
    expect(text).toContain('Open Deep Dive Queue');
    expect(text).toContain('2 queued');

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    const hrefs = links.map(
      (a) => a.getAttribute('href') ?? a.getAttribute('routerlink') ?? '',
    );
    expect(hrefs.some((h) => h.includes('/mistakes'))).toBeTrue();
    expect(hrefs.some((h) => h.includes('/deep-dive'))).toBeTrue();
  });

  it('renders the empty-session state without fabricating analytics', () => {
    createPage(() => of(emptyTodayRevisionFixture), () =>
      of({
        ...progressSummaryFixture,
        dueCount: 0,
        overdueCount: 0,
        unresolvedMistakeCount: 0,
        deepDiveCount: 0,
        statusCounts: { green: 0, yellow: 0, red: 52 },
      }),
    );
    expect(page.viewState()).toBe('ready');
    expect(page.session()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No open revision session');
    expect(text).toContain('Nothing is due right now');
    expect(text).toContain('Go to Today’s Revision');
    expect(text).not.toContain('streak');
    expect(text).not.toContain('leaderboard');
    expect(text).not.toContain('60%');
  });

  it('preserves revision summary when progress fails (no fake Phase 4 zeros)', () => {
    createPage(
      () => of(todayRevisionFixture),
      () =>
        throwError(
          () =>
            new ApiClientError({
              statusCode: 500,
              message: 'A server error occurred. Please try again later.',
              fromBackend: false,
            }),
        ),
    );
    expect(page.viewState()).toBe('ready');
    expect(page.progressState()).toBe('error');
    expect(page.dueCount()).toBe(2);
    expect(page.statusCounts()).toBeNull();
    expect(page.deepDiveCount()).toBeNull();
    expect(page.unresolvedMistakeCount()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load Phase 4 progress counts');
    expect(text).toContain('Continue Today’s Revision');
    expect(text).not.toContain('Green topics');
  });

  it('explains due topics when counts exist without an open session', () => {
    createPage(
      () =>
        of({
          status: 'ok' as const,
          dueCount: 3,
          overdueCount: 1,
          session: null,
        }),
      () =>
        of({
          ...progressSummaryFixture,
          dueCount: 3,
          overdueCount: 1,
        }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No open revision session');
    expect(text).toContain('3');
    expect(text).toContain('overdue');
    expect(text).not.toContain('Closures');
  });

  it('surfaces today load failures without staying stuck loading', () => {
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
    expect(revisionApi.getToday.calls.count()).toBe(1);
    revisionApi.getToday.and.returnValue(of(todayRevisionFixture));
    progressApi.getProgress.and.returnValue(of(progressSummaryFixture));
    const retry = fixture.nativeElement.querySelector(
      'button.dashboard__btn--primary',
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    expect(revisionApi.getToday.calls.count()).toBe(2);
    expect(progressApi.getProgress.calls.count()).toBe(2);
    expect(page.viewState()).toBe('ready');
  });

  it('calls getToday and getProgress once on load', () => {
    createPage(() => of(todayRevisionFixture));
    expect(revisionApi.getToday).toHaveBeenCalledTimes(1);
    expect(progressApi.getProgress).toHaveBeenCalledTimes(1);
    expect(revisionApi.submitAnswer).not.toHaveBeenCalled();
    expect(revisionApi.completeSession).not.toHaveBeenCalled();
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
        {
          provide: ProgressApiService,
          useValue: jasmine.createSpyObj<ProgressApiService>('ProgressApiService', [
            'getProgress',
          ]),
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
    const revisionApi = jasmine.createSpyObj<RevisionApiService>(
      'RevisionApiService',
      ['getToday'],
    );
    const progressApi = jasmine.createSpyObj<ProgressApiService>(
      'ProgressApiService',
      ['getProgress'],
    );
    revisionApi.getToday.and.returnValue(of(emptyTodayRevisionFixture));
    progressApi.getProgress.and.returnValue(of(progressSummaryFixture));

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
        { provide: RevisionApiService, useValue: revisionApi },
        { provide: ProgressApiService, useValue: progressApi },
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    expect(router.url).toBe('/dashboard');
  });
});
