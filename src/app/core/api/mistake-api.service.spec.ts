import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiClientError } from './api-error';
import {
  listMistakesFixture,
  mistakeDetailFixture,
} from './fixtures/phase4-contracts';
import {
  MistakeApiService,
  buildCreateMistakeBody,
  buildListMistakesParams,
} from './mistake-api.service';

describe('MistakeApiService', () => {
  let service: MistakeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MistakeApiService,
      ],
    });
    service = TestBed.inject(MistakeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs /api/mistakes with no query when listMistakes() is called empty', () => {
    let body: unknown;
    service.listMistakes().subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/mistakes');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(listMistakesFixture);
    expect(body).toEqual(listMistakesFixture);
  });

  it('GETs /api/mistakes with topicId, unresolvedOnly, limit, and offset', () => {
    service
      .listMistakes({
        topicId: 'topic-1',
        unresolvedOnly: true,
        limit: 10,
        offset: 20,
      })
      .subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/mistakes' && r.method === 'GET',
    );
    expect(req.request.params.get('topicId')).toBe('topic-1');
    expect(req.request.params.get('unresolvedOnly')).toBe('true');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('offset')).toBe('20');
    req.flush(listMistakesFixture);
  });

  it('GETs /api/mistakes/:id and deserializes detail including nullable provenance', () => {
    let body: unknown;
    service.getMistake('mistake-fixture-1').subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/mistakes/mistake-fixture-1');
    expect(req.request.method).toBe('GET');
    req.flush(mistakeDetailFixture);
    expect(body).toEqual(mistakeDetailFixture);
    expect((body as typeof mistakeDetailFixture).mistake.questionId).toBeNull();
    expect((body as typeof mistakeDetailFixture).mistake.resolvedAt).toBeNull();
  });

  it('POSTs /api/mistakes with create body omitting unset questionId', () => {
    let body: unknown;
    service
      .createMistake({
        topicId: 'topic-1',
        mistakeText: 'Confused about this',
        correctUnderstanding: 'Here is the correct understanding',
      })
      .subscribe((response) => {
        body = response;
      });

    const req = httpMock.expectOne('/api/mistakes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      topicId: 'topic-1',
      mistakeText: 'Confused about this',
      correctUnderstanding: 'Here is the correct understanding',
    });
    expect(req.request.body.questionId).toBeUndefined();
    req.flush(mistakeDetailFixture);
    expect(body).toEqual(mistakeDetailFixture);
  });

  it('POSTs /api/mistakes including optional questionId when provided', () => {
    service
      .createMistake({
        topicId: 'topic-1',
        mistakeText: 'text',
        correctUnderstanding: 'understanding',
        questionId: 'question-1',
      })
      .subscribe();

    const req = httpMock.expectOne('/api/mistakes');
    expect(req.request.body).toEqual({
      topicId: 'topic-1',
      mistakeText: 'text',
      correctUnderstanding: 'understanding',
      questionId: 'question-1',
    });
    req.flush(mistakeDetailFixture);
  });

  it('PATCHes /api/mistakes/:id with resolve and owner fields', () => {
    let body: unknown;
    service
      .updateMistake('mistake-fixture-1', {
        mistakeText: 'Updated text',
        turnedIntoQuestion: true,
        resolved: true,
      })
      .subscribe((response) => {
        body = response;
      });

    const req = httpMock.expectOne('/api/mistakes/mistake-fixture-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      mistakeText: 'Updated text',
      turnedIntoQuestion: true,
      resolved: true,
    });
    req.flush(mistakeDetailFixture);
    expect(body).toEqual(mistakeDetailFixture);
  });

  it('propagates normalized ApiClientError on failure', () => {
    let caught: unknown;
    service.getMistake('missing').subscribe({
      error: (error) => {
        caught = error;
      },
    });

    const req = httpMock.expectOne('/api/mistakes/missing');
    req.flush(
      { status: 'error', message: 'Mistake not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(caught instanceof ApiClientError).toBeTrue();
    expect((caught as ApiClientError).statusCode).toBe(404);
    expect((caught as ApiClientError).message).toBe('Mistake not found');
  });
});

describe('mistake request helpers', () => {
  it('buildListMistakesParams serializes unresolvedOnly false', () => {
    const params = buildListMistakesParams({ unresolvedOnly: false });
    expect(params.get('unresolvedOnly')).toBe('false');
    expect(params.get('topicId')).toBeNull();
  });

  it('buildCreateMistakeBody omits questionId when unset', () => {
    const body = buildCreateMistakeBody({
      topicId: 't',
      mistakeText: 'm',
      correctUnderstanding: 'c',
    });
    expect('questionId' in body).toBeFalse();
  });
});
