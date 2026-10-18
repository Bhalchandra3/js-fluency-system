import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ApiClientError } from '../../core/api/api-error';
import { RevisionApiService } from '../../core/api/revision-api.service';
import {
  TodayRevisionResponse,
  TodaySessionDto,
} from '../../core/api/revision.types';

export type DashboardViewState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly api = inject(RevisionApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewState = signal<DashboardViewState>('loading');
  readonly dueCount = signal(0);
  readonly overdueCount = signal(0);
  readonly session = signal<TodaySessionDto | null>(null);
  readonly pageError = signal<string | null>(null);

  private loadGeneration = 0;

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    const generation = ++this.loadGeneration;
    this.viewState.set('loading');
    this.pageError.set(null);

    this.api
      .getToday()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.applyTodayResponse(response);
        },
        error: (error: unknown) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.viewState.set('error');
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
