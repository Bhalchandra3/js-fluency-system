import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import { MistakeApiService } from '../../core/api/mistake-api.service';
import { MistakeDetailDto } from '../../core/api/mistake.types';

export type MistakeDetailViewState = 'loading' | 'ready' | 'error';

type LoadResult =
  | { generation: number; kind: 'missing' }
  | { generation: number; kind: 'ok'; mistake: MistakeDetailDto }
  | { generation: number; kind: 'error'; message: string };

@Component({
  selector: 'app-mistake-detail-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './mistake-detail.page.html',
  styleUrl: './mistake-detail.page.scss',
})
export class MistakeDetailPage {
  private readonly mistakesApi = inject(MistakeApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewState = signal<MistakeDetailViewState>('loading');
  readonly pageError = signal<string | null>(null);
  readonly mistake = signal<MistakeDetailDto | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly saving = signal(false);

  readonly editMistakeText = signal('');
  readonly editCorrectUnderstanding = signal('');
  readonly editTurnedIntoQuestion = signal(false);
  readonly editing = signal(false);

  private loadGeneration = 0;

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => this.loadById(params.get('id'))),
      )
      .subscribe((result) => this.applyLoadResult(result));
  }

  /** Public reload used by Retry and tests. */
  reload(): void {
    this.loadById(this.route.snapshot.paramMap.get('id'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.applyLoadResult(result));
  }

  startEditing(): void {
    const current = this.mistake();
    if (!current) {
      return;
    }
    this.editMistakeText.set(current.mistakeText);
    this.editCorrectUnderstanding.set(current.correctUnderstanding);
    this.editTurnedIntoQuestion.set(current.turnedIntoQuestion);
    this.editing.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.actionError.set(null);
  }

  saveEdits(): void {
    const current = this.mistake();
    if (!current || this.saving()) {
      return;
    }

    const mistakeText = this.editMistakeText().trim();
    const correctUnderstanding = this.editCorrectUnderstanding().trim();
    if (!mistakeText || !correctUnderstanding) {
      this.actionError.set('Mistake text and correct understanding are required.');
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.mistakesApi
      .updateMistake(current.id, {
        mistakeText,
        correctUnderstanding,
        turnedIntoQuestion: this.editTurnedIntoQuestion(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.applyMistake(response.mistake);
          this.editing.set(false);
          this.actionSuccess.set('Mistake updated.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.actionError.set(this.messageFromError(error));
        },
      });
  }

  resolveMistake(): void {
    this.setResolved(true, 'Mistake marked resolved.');
  }

  unresolveMistake(): void {
    this.setResolved(false, 'Mistake marked unresolved.');
  }

  isResolved(mistake: MistakeDetailDto): boolean {
    return mistake.resolvedAt !== null;
  }

  formatKolkataDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private loadById(rawId: string | null) {
    const id = rawId?.trim() ?? '';
    const generation = ++this.loadGeneration;
    this.viewState.set('loading');
    this.pageError.set(null);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.editing.set(false);
    this.mistake.set(null);

    if (!id) {
      return of<LoadResult>({ generation, kind: 'missing' });
    }

    return this.mistakesApi.getMistake(id).pipe(
      map(
        (response): LoadResult => ({
          generation,
          kind: 'ok',
          mistake: response.mistake,
        }),
      ),
      catchError((error: unknown) =>
        of<LoadResult>({
          generation,
          kind: 'error',
          message: this.messageFromError(error),
        }),
      ),
    );
  }

  private applyLoadResult(result: LoadResult): void {
    if (result.generation !== this.loadGeneration) {
      return;
    }
    if (result.kind === 'ok') {
      this.applyMistake(result.mistake);
      this.viewState.set('ready');
      return;
    }
    this.viewState.set('error');
    this.mistake.set(null);
    this.pageError.set(
      result.kind === 'missing' ? 'Mistake id is missing.' : result.message,
    );
  }

  private setResolved(resolved: boolean, successMessage: string): void {
    const current = this.mistake();
    if (!current || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.mistakesApi
      .updateMistake(current.id, { resolved })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.applyMistake(response.mistake);
          this.actionSuccess.set(successMessage);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.actionError.set(this.messageFromError(error));
        },
      });
  }

  private applyMistake(mistake: MistakeDetailDto): void {
    this.mistake.set(mistake);
    this.editMistakeText.set(mistake.mistakeText);
    this.editCorrectUnderstanding.set(mistake.correctUnderstanding);
    this.editTurnedIntoQuestion.set(mistake.turnedIntoQuestion);
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
