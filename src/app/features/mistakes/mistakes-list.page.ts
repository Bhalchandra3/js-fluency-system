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
import { forkJoin } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import { MistakeApiService } from '../../core/api/mistake-api.service';
import { MistakeListItemDto } from '../../core/api/mistake.types';
import { TopicsApiService } from '../../core/api/topics-api.service';
import { TopicListItemDto } from '../../core/api/topics.types';

export type MistakesListViewState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-mistakes-list-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './mistakes-list.page.html',
  styleUrl: './mistakes-list.page.scss',
})
export class MistakesListPage {
  private readonly mistakesApi = inject(MistakeApiService);
  private readonly topicsApi = inject(TopicsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewState = signal<MistakesListViewState>('loading');
  readonly pageError = signal<string | null>(null);
  readonly mistakes = signal<MistakeListItemDto[]>([]);
  readonly total = signal(0);
  readonly topics = signal<TopicListItemDto[]>([]);
  readonly unresolvedOnly = signal(false);

  readonly createTopicId = signal('');
  readonly createMistakeText = signal('');
  readonly createCorrectUnderstanding = signal('');
  readonly createQuestionId = signal('');
  readonly createError = signal<string | null>(null);
  readonly createSuccess = signal<string | null>(null);
  readonly creating = signal(false);
  readonly showCreateForm = signal(false);

  private loadGeneration = 0;

  readonly topicNameById = computed(() => {
    const map = new Map<string, string>();
    for (const topic of this.topics()) {
      map.set(topic.id, topic.name);
    }
    return map;
  });

  constructor() {
    this.loadMistakes();
  }

  loadMistakes(): void {
    const generation = ++this.loadGeneration;
    this.viewState.set('loading');
    this.pageError.set(null);

    const query = this.unresolvedOnly() ? { unresolvedOnly: true as const } : {};

    forkJoin({
      mistakes: this.mistakesApi.listMistakes(query),
      topics: this.topicsApi.listTopics(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ mistakes, topics }) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.mistakes.set(mistakes.mistakes);
          this.total.set(mistakes.total);
          this.topics.set(topics.topics);
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

  onUnresolvedFilterChange(checked: boolean): void {
    this.unresolvedOnly.set(checked);
    this.loadMistakes();
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((open) => !open);
    this.createError.set(null);
    this.createSuccess.set(null);
  }

  submitCreate(): void {
    if (this.creating()) {
      return;
    }

    this.createError.set(null);
    this.createSuccess.set(null);

    const topicId = this.createTopicId().trim();
    const mistakeText = this.createMistakeText().trim();
    const correctUnderstanding = this.createCorrectUnderstanding().trim();
    const questionIdRaw = this.createQuestionId().trim();

    if (!topicId) {
      this.createError.set('Select a topic.');
      return;
    }
    if (!mistakeText) {
      this.createError.set('Enter the mistaken understanding.');
      return;
    }
    if (!correctUnderstanding) {
      this.createError.set('Enter the correct understanding.');
      return;
    }

    this.creating.set(true);
    this.mistakesApi
      .createMistake({
        topicId,
        mistakeText,
        correctUnderstanding,
        ...(questionIdRaw.length > 0 ? { questionId: questionIdRaw } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.createMistakeText.set('');
          this.createCorrectUnderstanding.set('');
          this.createQuestionId.set('');
          this.createSuccess.set('Mistake saved.');
          this.loadMistakes();
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(this.messageFromError(error));
        },
      });
  }

  topicName(topicId: string): string {
    return this.topicNameById().get(topicId) ?? topicId;
  }

  isResolved(mistake: MistakeListItemDto): boolean {
    return mistake.resolvedAt !== null;
  }

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
