import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiClientError } from './api-error';
import {
  completeSessionFixture,
  emptyTodayRevisionFixture,
  submitAnswerFixture,
  todayFixtureLeaksAnswerFields,
  todayRevisionFixture,
} from './fixtures/revision-contracts';
import { RevisionApiService } from './revision-api.service';
import { buildSubmitAnswerBody } from './revision.types';

describe('RevisionApiService', () => {
  let service: RevisionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        RevisionApiService,
      ],
    });
    service = TestBed.inject(RevisionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs /api/revision/today and deserializes the response', () => {
    let body: unknown;
    service.getToday().subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/revision/today');
    expect(req.request.method).toBe('GET');
    req.flush(todayRevisionFixture);
    expect(body).toEqual(todayRevisionFixture);
  });

  it('POSTs /api/revision/answers with the correct body for MCQ', () => {
    let body: unknown;
    service
      .submitAnswer({
        sessionId: 's1',
        questionId: 'q1',
        selectedAnswer: '1',
        confidence: 'OKAY',
        format: 'MULTIPLE_CHOICE',
        selfAssessedCorrect: true,
      })
      .subscribe((response) => {
        body = response;
      });

    const req = httpMock.expectOne('/api/revision/answers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      sessionId: 's1',
      questionId: 'q1',
      selectedAnswer: '1',
      confidence: 'OKAY',
    });
    expect(req.request.body.selfAssessedCorrect).toBeUndefined();
    req.flush(submitAnswerFixture);
    expect(body).toEqual(submitAnswerFixture);
  });

  it('POSTs SHORT_ANSWER with selfAssessedCorrect', () => {
    service
      .submitAnswer({
        sessionId: 's1',
        questionId: 'q2',
        selectedAnswer: 'free text',
        confidence: 'DIFFICULT',
        format: 'SHORT_ANSWER',
        selfAssessedCorrect: false,
      })
      .subscribe();

    const req = httpMock.expectOne('/api/revision/answers');
    expect(req.request.body).toEqual({
      sessionId: 's1',
      questionId: 'q2',
      selectedAnswer: 'free text',
      confidence: 'DIFFICULT',
      selfAssessedCorrect: false,
    });
    req.flush(submitAnswerFixture);
  });

  it('POSTs /api/revision/complete with sessionId', () => {
    let body: unknown;
    service.completeSession('session-fixture-1').subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/revision/complete');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ sessionId: 'session-fixture-1' });
    req.flush(completeSessionFixture);
    expect(body).toEqual(completeSessionFixture);
  });

  it('propagates normalized ApiClientError on failure', () => {
    let caught: unknown;
    service.getToday().subscribe({
      error: (error) => {
        caught = error;
      },
    });

    const req = httpMock.expectOne('/api/revision/today');
    req.flush(
      { status: 'error', message: 'Session not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(caught instanceof ApiClientError).toBeTrue();
    expect((caught as ApiClientError).statusCode).toBe(404);
    expect((caught as ApiClientError).message).toBe('Session not found');
  });

  it('rejects SHORT_ANSWER without selfAssessedCorrect before calling HTTP', () => {
    let caught: unknown;
    service
      .submitAnswer({
        sessionId: 's1',
        questionId: 'q2',
        selectedAnswer: 'text',
        confidence: 'EASY',
        format: 'SHORT_ANSWER',
      })
      .subscribe({
        error: (error) => {
          caught = error;
        },
      });

    httpMock.expectNone('/api/revision/answers');
    expect(caught instanceof ApiClientError).toBeTrue();
    expect((caught as ApiClientError).statusCode).toBe(400);
  });
});

describe('revision contract fixtures', () => {
  it('today fixture has no correctAnswer or explanation', () => {
    expect(todayFixtureLeaksAnswerFields(todayRevisionFixture)).toBeFalse();
    expect(todayFixtureLeaksAnswerFields(emptyTodayRevisionFixture)).toBeFalse();
  });

  it('buildSubmitAnswerBody omits selfAssessedCorrect for MCQ', () => {
    const body = buildSubmitAnswerBody({
      sessionId: 's',
      questionId: 'q',
      selectedAnswer: '0',
      confidence: 'EASY',
      format: 'MULTIPLE_CHOICE',
      selfAssessedCorrect: true,
    });
    expect('selfAssessedCorrect' in body).toBeFalse();
  });
});
