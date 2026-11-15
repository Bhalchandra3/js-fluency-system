import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import { ProgressApiService } from '../../core/api/progress-api.service';
import {
  escalationGateLabel,
  escalationPrimaryPath,
  ProgressEscalation,
  ProgressStatusCounts,
  ProgressSummaryResponse,
} from '../../core/api/progress.types';
import { RevisionApiService } from '../../core/api/revision-api.service';
import {
  TodayRevisionResponse,
  TodaySessionDto,
} from '../../core/api/revision.types';

export type DashboardViewState = 'loading' | 'ready' | 'error';
export type ProgressPanelState = 'loading' | 'ready' | 'error';

type ProgressLoadResult =
  | { ok: true; response: ProgressSummaryResponse }
  | { ok: false; message: string };

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly revisionApi = inject(RevisionApiService);
  private readonly progressApi = inject(ProgressApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewState = signal<DashboardViewState>('loading');
  readonly progressState = signal<ProgressPanelState>('loading');
  readonly dueCount = signal(0);
  readonly overdueCount = signal(0);
  readonly session = signal<TodaySessionDto | null>(null);
  readonly pageError = signal<string | null>(null);
  readonly progressError = signal<string | null>(null);

  readonly statusCounts = signal<ProgressStatusCounts | null>(null);
  readonly deepDiveCount = signal<number | null>(null);
  readonly unresolvedMistakeCount = signal<number | null>(null);
  readonly escalations = signal<ProgressEscalation[]>([]);
  readonly patternGateVersion = signal<string | null>(null);

  readonly escalationGateLabel = escalationGateLabel;
  readonly escalationPrimaryPath = escalationPrimaryPath;

  private loadGeneration = 0;
  private lastLoadedAt = 0;

  constructor() {
    this.loadDashboard();

    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (
          document.visibilityState === 'visible' &&
          Date.now() - this.lastLoadedAt > 60_000 &&
          this.viewState() !== 'loading'
        ) {
          this.loadDashboard();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }
  }

  loadDashboard(): void {
    const generation = ++this.loadGeneration;
    this.viewState.set('loading');
    this.progressState.set('loading');
    this.pageError.set(null);
    this.progressError.set(null);
    this.statusCounts.set(null);
    this.deepDiveCount.set(null);
    this.unresolvedMistakeCount.set(null);
    this.escalations.set([]);
    this.patternGateVersion.set(null);

    const progress$ = this.progressApi.getProgress().pipe(
      map((response): ProgressLoadResult => ({ ok: true, response })),
      catchError((error: unknown) =>
        of<ProgressLoadResult>({
          ok: false,
          message: this.messageFromError(error),
        }),
      ),
    );

    forkJoin({
      today: this.revisionApi.getToday(),
      progress: progress$,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ today, progress }) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.lastLoadedAt = Date.now();
          this.applyTodayResponse(today);
          if (!progress.ok) {
            this.progressState.set('error');
            this.progressError.set(progress.message);
            return;
          }
          const summary = progress.response;
          this.statusCounts.set(summary.statusCounts);
          this.deepDiveCount.set(summary.deepDiveCount);
          this.unresolvedMistakeCount.set(summary.unresolvedMistakeCount);
          this.escalations.set(summary.escalations ?? []);
          this.patternGateVersion.set(summary.patternGateVersion ?? null);
          // Same Kolkata due semantics as today; prefer the dedicated summary when present.
          this.dueCount.set(summary.dueCount);
          this.overdueCount.set(summary.overdueCount);
          this.progressState.set('ready');
        },
        error: (error: unknown) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.viewState.set('error');
          this.progressState.set('error');
          this.pageError.set(this.messageFromError(error));
        },
      });
  }

  /** Display helper only — does not compute schedule intervals. */
  formatKolkataDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private applyTodayResponse(response: TodayRevisionResponse): void {
    this.dueCount.set(response.dueCount);
    this.overdueCount.set(response.overdueCount);
    this.session.set(response.session);
    this.viewState.set('ready');
  }

  private messageFromError(error: unknown): string {
    if (error instanceof ApiClientError) {
      return error.message;
    }
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }
}
