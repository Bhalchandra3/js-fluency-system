import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ApiClientError } from '../../core/api/api-error';
import {
  completeSessionFixture,
  emptyTodayRevisionFixture,
  submitAnswerFixture,
  todayRevisionFixture,
} from '../../core/api/fixtures/revision-contracts';
import { RevisionApiService } from '../../core/api/revision-api.service';
import { buildSubmitAnswerBody } from '../../core/api/revision.types';
import { RevisionTodayPage } from './revision-today.page';

describe('RevisionTodayPage', () => {
  let fixture: ComponentFixture<RevisionTodayPage>;
  let page: RevisionTodayPage;
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
    api.submitAnswer.and.returnValue(of(submitAnswerFixture));
    api.completeSession.and.returnValue(of(completeSessionFixture));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RevisionTodayPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RevisionApiService, useValue: api },
      ],
    });

    fixture = TestBed.createComponent(RevisionTodayPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows a loading state while getToday is in flight', () => {
    api = jasmine.createSpyObj<RevisionApiService>('RevisionApiService', [
      'getToday',
      'submitAnswer',
      'completeSession',
    ]);
    // Never emit — leave loading visible for the assertion.
    api.getToday.and.returnValue(NEVER);

    TestBed.configureTestingModule({
      imports: [RevisionTodayPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: RevisionApiService, useValue: api },
      ],
    });
    fixture = TestBed.createComponent(RevisionTodayPage);
    page = fixture.componentInstance;
    expect(page.viewState()).toBe('loading');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading');
  });

  it('renders the empty-session state with due counts', () => {
    createPage(() => of(emptyTodayRevisionFixture));
    expect(page.viewState()).toBe('empty');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No revision session today');
    expect(text).toContain('Due topics');
  });

  it('renders topic information and frozen question order', () => {
    createPage(() => of(todayRevisionFixture));
    expect(page.viewState()).toBe('session');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Closures');
    expect(text).toContain('Overdue');
    expect(text).toContain('0 / 2');
    expect(text).toContain('What does a closure capture?');

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.revision__qbtn'),
    ) as HTMLButtonElement[];
    expect(buttons.length).toBe(2);
    expect(buttons[0]?.textContent).toContain('1');
    expect(buttons[1]?.textContent).toContain('2');
  });

  it('does not show correctAnswer or explanation before submission', () => {
    createPage(() => of(todayRevisionFixture));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Correct answer');
    expect(text).not.toContain('A closure captures its lexical environment');
    expect(page.currentFeedback()).toBeNull();
  });

  it('requires confidence before enabling submit for MCQ', () => {
    createPage(() => of(todayRevisionFixture));
    page.setSelectedAnswer('1');
    expect(page.canSubmitCurrent()).toBeFalse();
    page.setConfidence('OKAY');
    expect(page.canSubmitCurrent()).toBeTrue();
  });

  it('submits MCQ with index string and omits selfAssessedCorrect', () => {
    createPage(() => of(todayRevisionFixture));
    page.setSelectedAnswer('1');
    page.setConfidence('OKAY');
    page.submitCurrentAnswer();

    expect(api.submitAnswer).toHaveBeenCalled();
    const arg = api.submitAnswer.calls.mostRecent().args[0];
    expect(arg.sessionId).toBe('session-fixture-1');
    expect(arg.questionId).toBe('question-mcq-1');
    expect(arg.selectedAnswer).toBe('1');
    expect(arg.confidence).toBe('OKAY');
    expect(arg.format).toBe('MULTIPLE_CHOICE');
    expect(buildSubmitAnswerBody(arg).selfAssessedCorrect).toBeUndefined();

    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Result: Correct');
    expect(text).toContain('Correct answer');
    expect(page.session()?.progress.answered).toBe(1);
  });

  it('submits SHORT_ANSWER with self-assessment', () => {
    createPage(() => of(todayRevisionFixture));
    page.selectQuestion(1);
    page.setSelectedAnswer('My attempt');
    page.setSelfAssessedCorrect(false);
    page.setConfidence('DIFFICULT');
    page.submitCurrentAnswer();

    const arg = api.submitAnswer.calls.mostRecent().args[0];
    expect(arg.questionId).toBe('question-short-1');
    expect(arg.format).toBe('SHORT_ANSWER');
    expect(arg.selfAssessedCorrect).toBeFalse();
    expect(arg.selectedAnswer).toBe('My attempt');
  });

  it('preserves local draft input when navigating between questions', () => {
    createPage(() => of(todayRevisionFixture));
    page.setSelectedAnswer('2');
    page.setConfidence('EASY');
    page.selectQuestion(1);
    page.setSelectedAnswer('notes for q2');
    page.selectQuestion(0);
    expect(page.currentDraft().selectedAnswer).toBe('2');
    expect(page.currentDraft().confidence).toBe('EASY');
    page.selectQuestion(1);
    expect(page.currentDraft().selectedAnswer).toBe('notes for q2');
  });

  it('keeps draft input after a failed submission', () => {
    createPage(() => of(todayRevisionFixture));
    api.submitAnswer.and.returnValue(
      throwError(
        () =>
          new ApiClientError({
            statusCode: 400,
            message: 'invalid confidence',
            fromBackend: true,
          }),
      ),
    );
    page.setSelectedAnswer('1');
    page.setConfidence('OKAY');
    page.submitCurrentAnswer();
    expect(page.currentDraft().selectedAnswer).toBe('1');
    expect(page.isAnswered('question-mcq-1')).toBeFalse();
    expect(page.actionError()).toContain('invalid confidence');
  });

  it('does not auto-complete after the final answer', () => {
    createPage(() => of(todayRevisionFixture));
    api.submitAnswer.and.returnValue(
      of({
        ...submitAnswerFixture,
        progress: { answered: 2, total: 2 },
        canComplete: true,
      }),
    );
    page.setSelectedAnswer('1');
    page.setConfidence('OKAY');
    page.submitCurrentAnswer();
    expect(api.completeSession).not.toHaveBeenCalled();
    expect(page.viewState()).toBe('session');
    expect(page.canComplete()).toBeTrue();
  });

  it('completes only after explicit confirmation and shows scheduling summary', () => {
    createPage(() =>
      of({
        ...todayRevisionFixture,
        session: {
          ...todayRevisionFixture.session!,
          progress: { answered: 2, total: 2 },
          canComplete: true,
        },
      }),
    );
    expect(page.canComplete()).toBeTrue();
    page.openCompleteConfirm();
    expect(page.confirmCompleteOpen()).toBeTrue();
    page.confirmCompleteSession();
    expect(api.completeSession).toHaveBeenCalledWith('session-fixture-1');
    expect(page.viewState()).toBe('completed');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Session completed');
    expect(text).toContain('Reinforced');
    expect(text).toContain('phase3-g5-v1');
    expect(text).toContain(completeSessionFixture.scheduling.reason);
  });

  it('handles incomplete-session 409 by refreshing today', () => {
    createPage(() => of(todayRevisionFixture));
    api.completeSession.and.returnValue(
      throwError(
        () =>
          new ApiClientError({
            statusCode: 409,
            message: 'Session has unanswered questions',
            fromBackend: true,
          }),
      ),
    );
    // Force canComplete path for the confirm call.
    page.session.update((session) =>
      session
        ? { ...session, canComplete: true, progress: { answered: 2, total: 2 } }
        : session,
    );
    page.confirmCompleteSession();
    expect(api.getToday.calls.count()).toBeGreaterThan(1);
    expect(page.viewState()).toBe('session');
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
  });

  it('does not invent frontend scheduling values on completion display', () => {
    createPage(() =>
      of({
        ...todayRevisionFixture,
        session: {
          ...todayRevisionFixture.session!,
          canComplete: true,
          progress: { answered: 2, total: 2 },
        },
      }),
    );
    page.confirmCompleteSession();
    expect(page.scheduling()).toEqual(completeSessionFixture.scheduling);
  });
});
