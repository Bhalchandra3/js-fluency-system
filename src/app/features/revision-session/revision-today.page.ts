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
import { RevisionApiService } from '../../core/api/revision-api.service';
import {
  CompleteSchedulingDto,
  ConfidenceLevel,
  TodayQuestionDto,
  TodayRevisionResponse,
  TodaySessionDto,
  asStringOptions,
} from '../../core/api/revision.types';

export type RevisionViewState =
  | 'loading'
  | 'empty'
  | 'session'
  | 'completed'
  | 'error';

export type QuestionDraft = {
  selectedAnswer: string;
  confidence: ConfidenceLevel | null;
  selfAssessedCorrect: boolean | null;
};

export type QuestionFeedback = {
  correct: boolean;
  correctAnswer?: string;
  explanation?: string;
};

export const CONFIDENCE_OPTIONS: ReadonlyArray<{
  value: ConfidenceLevel;
  label: string;
}> = [
  { value: 'EASY', label: 'Easy' },
  { value: 'OKAY', label: 'Okay' },
  { value: 'DIFFICULT', label: 'Difficult' },
  { value: 'DIDNT_UNDERSTAND', label: "Didn't understand" },
];

function emptyDraft(): QuestionDraft {
  return {
    selectedAnswer: '',
    confidence: null,
    selfAssessedCorrect: null,
  };
}

@Component({
  selector: 'app-revision-today-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './revision-today.page.html',
  styleUrl: './revision-today.page.scss',
})
export class RevisionTodayPage {
  private readonly api = inject(RevisionApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly confidenceOptions = CONFIDENCE_OPTIONS;

  readonly viewState = signal<RevisionViewState>('loading');
  readonly dueCount = signal(0);
  readonly overdueCount = signal(0);
  readonly session = signal<TodaySessionDto | null>(null);
  readonly currentIndex = signal(0);
  readonly pageError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly submitting = signal(false);
  readonly completing = signal(false);
  readonly confirmCompleteOpen = signal(false);

  readonly scheduling = signal<CompleteSchedulingDto | null>(null);

  /** Unsaved local input keyed by question id. */
  private readonly drafts = signal<Record<string, QuestionDraft>>({});
  /** Authoritative feedback keyed by question id. */
  private readonly feedbackByQuestion = signal<Record<string, QuestionFeedback>>(
    {},
  );

  private loadGeneration = 0;
  private submitGeneration = 0;
  private completeGeneration = 0;

  readonly currentQuestion = computed(() => {
    const session = this.session();
    if (!session) {
      return null;
    }
    return session.questions[this.currentIndex()] ?? null;
  });

  readonly currentDraft = computed(() => {
    const question = this.currentQuestion();
    if (!question) {
      return emptyDraft();
    }
    return this.drafts()[question.id] ?? emptyDraft();
  });

  readonly currentFeedback = computed(() => {
    const question = this.currentQuestion();
    if (!question) {
      return null;
    }
    return this.feedbackByQuestion()[question.id] ?? null;
  });

  readonly mcqOptions = computed(() => {
    const question = this.currentQuestion();
    if (!question || question.format !== 'MULTIPLE_CHOICE') {
      return null;
    }
    return asStringOptions(question.options);
  });

  readonly questionCount = computed(() => this.session()?.questions.length ?? 0);

  readonly canSubmitCurrent = computed(() => {
    const question = this.currentQuestion();
    const draft = this.currentDraft();
    if (!question || this.submitting() || this.completing()) {
      return false;
    }
    if (!draft.confidence) {
      return false;
    }
    if (question.format === 'MULTIPLE_CHOICE') {
      const options = this.mcqOptions();
      if (!options || options.length === 0) {
        return false;
      }
      const index = Number(draft.selectedAnswer);
      return (
        Number.isInteger(index) &&
        String(index) === draft.selectedAnswer &&
        index >= 0 &&
        index < options.length
      );
    }
    if (question.format === 'SHORT_ANSWER') {
      return (
        draft.selectedAnswer.trim().length > 0 &&
        typeof draft.selfAssessedCorrect === 'boolean'
      );
    }
    return false;
  });

  readonly canComplete = computed(() => {
    const session = this.session();
    return (
      !!session &&
      session.canComplete &&
      this.viewState() === 'session' &&
      !this.submitting() &&
      !this.completing()
    );
  });

  constructor() {
    this.loadToday();
  }

  loadToday(): void {
    const generation = ++this.loadGeneration;
    this.viewState.set('loading');
    this.pageError.set(null);
    this.actionError.set(null);
    this.statusMessage.set(null);
    this.confirmCompleteOpen.set(false);
    this.scheduling.set(null);

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

  selectQuestion(index: number): void {
    const session = this.session();
    if (!session || this.submitting() || this.completing()) {
      return;
    }
    if (index < 0 || index >= session.questions.length) {
      return;
    }
    this.currentIndex.set(index);
    this.actionError.set(null);
  }

  goPrevious(): void {
    this.selectQuestion(this.currentIndex() - 1);
  }

  goNext(): void {
    this.selectQuestion(this.currentIndex() + 1);
  }

  isAnswered(questionId: string): boolean {
    return Object.prototype.hasOwnProperty.call(
      this.feedbackByQuestion(),
      questionId,
    );
  }

  patchDraft(partial: Partial<QuestionDraft>): void {
    const question = this.currentQuestion();
    if (!question || this.submitting()) {
      return;
    }
    const current = this.drafts()[question.id] ?? emptyDraft();
    this.drafts.update((map) => ({
      ...map,
      [question.id]: { ...current, ...partial },
    }));
  }

  setSelectedAnswer(value: string): void {
    this.patchDraft({ selectedAnswer: value });
  }

  setConfidence(value: ConfidenceLevel): void {
    this.patchDraft({ confidence: value });
  }

  setSelfAssessedCorrect(value: boolean): void {
    this.patchDraft({ selfAssessedCorrect: value });
  }

  submitCurrentAnswer(): void {
    const session = this.session();
    const question = this.currentQuestion();
    const draft = this.currentDraft();
    if (!session || !question || !this.canSubmitCurrent()) {
      return;
    }

    if (question.format !== 'MULTIPLE_CHOICE' && question.format !== 'SHORT_ANSWER') {
      this.actionError.set(
        'This question format is not supported in Today’s Revision yet.',
      );
      return;
    }

    const generation = ++this.submitGeneration;
    const sessionId = session.id;
    const questionId = question.id;
    this.submitting.set(true);
    this.actionError.set(null);
    this.statusMessage.set(null);

    this.api
      .submitAnswer({
        sessionId,
        questionId,
        selectedAnswer: draft.selectedAnswer,
        confidence: draft.confidence!,
        format: question.format,
        selfAssessedCorrect:
          question.format === 'SHORT_ANSWER'
            ? draft.selfAssessedCorrect!
            : undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (
            generation !== this.submitGeneration ||
            this.session()?.id !== sessionId
          ) {
            return;
          }
          this.submitting.set(false);
          this.feedbackByQuestion.update((map) => ({
            ...map,
            [questionId]: {
              correct: response.correct,
              correctAnswer: response.correctAnswer,
              explanation: response.explanation,
            },
          }));
          this.session.update((current) =>
            current
              ? {
                  ...current,
                  progress: response.progress,
                  canComplete: response.canComplete,
                }
              : current,
          );
          this.statusMessage.set(
            response.correct
              ? 'Answer saved. Marked correct.'
              : 'Answer saved. Marked incorrect.',
          );
        },
        error: (error: unknown) => {
          if (generation !== this.submitGeneration) {
            return;
          }
          this.submitting.set(false);
          this.actionError.set(this.messageFromError(error));
        },
      });
  }

  openCompleteConfirm(): void {
    if (!this.canComplete()) {
      return;
    }
    this.confirmCompleteOpen.set(true);
    this.actionError.set(null);
  }

  cancelCompleteConfirm(): void {
    this.confirmCompleteOpen.set(false);
  }

  confirmCompleteSession(): void {
    const session = this.session();
    if (!session || !this.canComplete()) {
      return;
    }

    const generation = ++this.completeGeneration;
    const sessionId = session.id;
    this.completing.set(true);
    this.confirmCompleteOpen.set(false);
    this.actionError.set(null);
    this.statusMessage.set(null);

    this.api
      .completeSession(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (generation !== this.completeGeneration) {
            return;
          }
          this.completing.set(false);
          this.scheduling.set(response.scheduling);
          this.viewState.set('completed');
          this.statusMessage.set('Session completed. Schedule updated.');
        },
        error: (error: unknown) => {
          if (generation !== this.completeGeneration) {
            return;
          }
          this.completing.set(false);
          if (error instanceof ApiClientError && error.statusCode === 409) {
            this.actionError.set(
              error.message ||
                'This session cannot be completed yet. Refreshing the latest state.',
            );
            this.loadToday();
            return;
          }
          this.actionError.set(this.messageFromError(error));
        },
      });
  }

  outcomeLabel(outcome: string): string {
    switch (outcome) {
      case 'ADVANCE':
        return 'Advanced';
      case 'REINFORCE':
        return 'Reinforced';
      case 'REINFORCE_AT_1':
        return 'Reinforced at 1 day';
      case 'RESET':
        return 'Reset';
      default:
        return outcome;
    }
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

  questionStatusLabel(question: TodayQuestionDto, index: number): string {
    const selected = index === this.currentIndex();
    const answered = this.isAnswered(question.id);
    if (selected && answered) {
      return `Question ${index + 1}, current, answered`;
    }
    if (selected) {
      return `Question ${index + 1}, current, unanswered`;
    }
    if (answered) {
      return `Question ${index + 1}, answered`;
    }
    return `Question ${index + 1}, unanswered`;
  }

  private applyTodayResponse(response: TodayRevisionResponse): void {
    this.dueCount.set(response.dueCount);
    this.overdueCount.set(response.overdueCount);

    if (!response.session) {
      this.session.set(null);
      this.viewState.set('empty');
      return;
    }

    const previousSessionId = this.session()?.id;
    this.session.set(response.session);
    this.viewState.set('session');

    if (previousSessionId !== response.session.id) {
      this.drafts.set({});
      this.feedbackByQuestion.set({});
      this.currentIndex.set(0);
    } else {
      const maxIndex = Math.max(response.session.questions.length - 1, 0);
      if (this.currentIndex() > maxIndex) {
        this.currentIndex.set(maxIndex);
      }
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
