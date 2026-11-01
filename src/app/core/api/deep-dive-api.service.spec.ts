import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiClientError } from './api-error';
import { DeepDiveApiService } from './deep-dive-api.service';
import {
  deepDiveNoteFixture,
  deleteDeepDiveFixture,
  listDeepDiveFixture,
} from './fixtures/phase4-contracts';

describe('DeepDiveApiService', () => {
  let service: DeepDiveApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        DeepDiveApiService,
      ],
    });
    service = TestBed.inject(DeepDiveApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs /api/deep-dive and deserializes notes with nullable notes', () => {
    let body: unknown;
    service.listDeepDive().subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/deep-dive');
    expect(req.request.method).toBe('GET');
    req.flush(listDeepDiveFixture);
    expect(body).toEqual(listDeepDiveFixture);
    expect((body as typeof listDeepDiveFixture).notes[0].notes).toBeNull();
  });

  it('PATCHes /api/deep-dive/:topicId with reason and notes', () => {
    let body: unknown;
    service
      .updateDeepDive('topic-fixture-1', {
        reason: 'Need deeper study',
        notes: 'Owner study notes',
      })
      .subscribe((response) => {
        body = response;
      });

    const req = httpMock.expectOne('/api/deep-dive/topic-fixture-1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      reason: 'Need deeper study',
      notes: 'Owner study notes',
    });
    req.flush(deepDiveNoteFixture);
    expect(body).toEqual(deepDiveNoteFixture);
  });

  it('PATCHes notes: null to clear owner notes', () => {
    service.updateDeepDive('topic-fixture-1', { notes: null }).subscribe();

    const req = httpMock.expectOne('/api/deep-dive/topic-fixture-1');
    expect(req.request.body).toEqual({ notes: null });
    req.flush({
      status: 'ok',
      note: { ...listDeepDiveFixture.notes[0], notes: null },
    });
  });

  it('DELETEs /api/deep-dive/:topicId', () => {
    let body: unknown;
    service.deleteDeepDive('topic-fixture-1').subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/deep-dive/topic-fixture-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(deleteDeepDiveFixture);
    expect(body).toEqual(deleteDeepDiveFixture);
  });

  it('propagates normalized ApiClientError on failure', () => {
    let caught: unknown;
    service.listDeepDive().subscribe({
      error: (error) => {
        caught = error;
      },
    });

    const req = httpMock.expectOne('/api/deep-dive');
    req.flush(
      { status: 'error', message: 'Deep Dive note not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(caught instanceof ApiClientError).toBeTrue();
    expect((caught as ApiClientError).statusCode).toBe(404);
    expect((caught as ApiClientError).message).toBe('Deep Dive note not found');
  });
});
