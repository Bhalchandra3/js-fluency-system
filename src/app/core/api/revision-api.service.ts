import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiClientError, normalizeApiError } from './api-error';
import {
  CompleteSessionResponse,
  SubmitAnswerInput,
  SubmitAnswerResponse,
  TodayRevisionResponse,
  buildSubmitAnswerBody,
} from './revision.types';

const REVISION_TODAY_PATH = '/api/revision/today';
const REVISION_ANSWERS_PATH = '/api/revision/answers';
const REVISION_COMPLETE_PATH = '/api/revision/complete';

/**
 * Typed client for Phase 3 revision APIs.
 * Auth headers are supplied by `authInterceptor` — not duplicated here.
 */
@Injectable({ providedIn: 'root' })
export class RevisionApiService {
  private readonly http = inject(HttpClient);

  getToday(): Observable<TodayRevisionResponse> {
    return this.http.get<TodayRevisionResponse>(REVISION_TODAY_PATH).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }

  submitAnswer(input: SubmitAnswerInput): Observable<SubmitAnswerResponse> {
    let body;
    try {
      body = buildSubmitAnswerBody(input);
    } catch (error) {
      return throwError(
        () =>
          new ApiClientError({
            statusCode: 400,
            message:
              error instanceof Error
                ? error.message
                : 'Invalid answer submission input',
            fromBackend: false,
          }),
      );
    }

    return this.http.post<SubmitAnswerResponse>(REVISION_ANSWERS_PATH, body).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }

  completeSession(sessionId: string): Observable<CompleteSessionResponse> {
    return this.http
      .post<CompleteSessionResponse>(REVISION_COMPLETE_PATH, { sessionId })
      .pipe(
        catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
      );
  }
}
