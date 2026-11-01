import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiClientError } from '../../core/api/api-error';
import { DeepDiveApiService } from '../../core/api/deep-dive-api.service';
import { DeepDiveNoteDto } from '../../core/api/deep-dive.types';

export type DeepDiveViewState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-deep-dive-queue-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './deep-dive-queue.page.html',
  styleUrl: './deep-dive-queue.page.scss',
})
export class DeepDiveQueuePage {
  private readonly api = inject(DeepDiveApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewState = signal<DeepDiveViewState>('loading');
  readonly pageError = signal<string | null>(null);
  readonly notes = signal<DeepDiveNoteDto[]>([]);
  readonly selectedTopicId = signal<string | null>(null);

  readonly editReason = signal('');
  readonly editNotes = signal('');
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly saving = signal(false);
  readonly removing = signal(false);

  private loadGeneration = 0;

  readonly selectedNote = computed(() => {
    const topicId = this.selectedTopicId();
    if (!topicId) {
      return null;
    }
    return this.notes().find((note) => note.topicId === topicId) ?? null;
  });

  constructor() {
    this.loadQueue();
  }

  loadQueue(): void {
    const generation = ++this.loadGeneration;
    this.viewState.set('loading');
    this.pageError.set(null);

    this.api
      .listDeepDive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.notes.set(response.notes);
          const selectedId = this.selectedTopicId();
          if (
            selectedId &&
            !response.notes.some((note) => note.topicId === selectedId)
          ) {
            this.clearSelection();
          } else if (selectedId) {
            const current = response.notes.find((n) => n.topicId === selectedId);
            if (current) {
              this.syncEditorFromNote(current);
            }
          }
          this.viewState.set('ready');
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

  selectNote(note: DeepDiveNoteDto): void {
    this.selectedTopicId.set(note.topicId);
    this.syncEditorFromNote(note);
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }

  clearSelection(): void {
    this.selectedTopicId.set(null);
    this.editReason.set('');
    this.editNotes.set('');
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }

  saveEdits(): void {
    const topicId = this.selectedTopicId();
    const current = this.selectedNote();
    if (!topicId || !current || this.saving() || this.removing()) {
      return;
    }

    const reason = this.editReason().trim();
    if (!reason) {
      this.actionError.set('Reason must be a non-empty string.');
      return;
    }

    // Preserve empty-string notes as "" (distinct from null clear).
    const notes = this.editNotes();

    this.saving.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.api
      .updateDeepDive(topicId, { reason, notes })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.replaceNoteInList(response.note);
          this.syncEditorFromNote(response.note);
          this.actionSuccess.set('Deep Dive note saved.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.actionError.set(this.messageFromError(error));
          // Keep editor drafts; do not overwrite from stale list on failure.
        },
      });
  }

  clearNotes(): void {
    const topicId = this.selectedTopicId();
    const current = this.selectedNote();
    if (!topicId || !current || this.saving() || this.removing()) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.api
      .updateDeepDive(topicId, { notes: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.replaceNoteInList(response.note);
          this.syncEditorFromNote(response.note);
          this.actionSuccess.set('Notes cleared.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.actionError.set(this.messageFromError(error));
        },
      });
  }

  removeFromQueue(): void {
    const topicId = this.selectedTopicId();
    if (!topicId || this.saving() || this.removing()) {
      return;
    }

    this.removing.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.api
      .deleteDeepDive(topicId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removing.set(false);
          this.notes.update((list) => list.filter((n) => n.topicId !== topicId));
          this.clearSelection();
          this.actionSuccess.set('Removed from Deep Dive queue.');
        },
        error: (error: unknown) => {
          this.removing.set(false);
          this.actionError.set(this.messageFromError(error));
        },
      });
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

  private syncEditorFromNote(note: DeepDiveNoteDto): void {
    this.editReason.set(note.reason);
    this.editNotes.set(note.notes ?? '');
  }

  private replaceNoteInList(note: DeepDiveNoteDto): void {
    this.notes.update((list) =>
      list.map((item) => (item.topicId === note.topicId ? note : item)),
    );
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
