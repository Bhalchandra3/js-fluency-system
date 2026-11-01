import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiClientError } from './api-error';
import { progressSummaryFixture } from './fixtures/phase4-contracts';
import { ProgressApiService } from './progress-api.service';

describe('ProgressApiService', () => {
  let service: ProgressApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ProgressApiService,
      ],
    });
    service = TestBed.inject(ProgressApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs /api/progress and deserializes the summary shape', () => {
    let body: unknown;
    service.getProgress().subscribe((response) => {
      body = response;
    });

    const req = httpMock.expectOne('/api/progress');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(progressSummaryFixture);
    expect(body).toEqual(progressSummaryFixture);
    expect((body as typeof progressSummaryFixture).statusCounts.green).toBe(10);
    expect((body as typeof progressSummaryFixture).unresolvedMistakeCount).toBe(3);
  });

  it('propagates normalized ApiClientError on failure', () => {
    let caught: unknown;
    service.getProgress().subscribe({
      error: (error) => {
        caught = error;
      },
    });

    const req = httpMock.expectOne('/api/progress');
    req.flush(
      { status: 'error', message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(caught instanceof ApiClientError).toBeTrue();
    expect((caught as ApiClientError).statusCode).toBe(401);
    expect((caught as ApiClientError).message).toBe('Unauthorized');
  });
});
