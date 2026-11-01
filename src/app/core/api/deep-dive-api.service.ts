import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiClientError, normalizeApiError } from './api-error';
import {
  DeepDiveNoteResponse,
  DeleteDeepDiveResponse,
  ListDeepDiveResponse,
  UpdateDeepDiveRequestBody,
} from './deep-dive.types';

const DEEP_DIVE_PATH = '/api/deep-dive';

/**
 * Typed client for Phase 4 Deep Dive Queue APIs.
 * Auth headers are supplied by `authInterceptor` — not duplicated here.
 */
@Injectable({ providedIn: 'root' })
export class DeepDiveApiService {
  private readonly http = inject(HttpClient);

  listDeepDive(): Observable<ListDeepDiveResponse> {
    return this.http.get<ListDeepDiveResponse>(DEEP_DIVE_PATH).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }

  updateDeepDive(
    topicId: string,
    body: UpdateDeepDiveRequestBody,
  ): Observable<DeepDiveNoteResponse> {
    return this.http
      .patch<DeepDiveNoteResponse>(`${DEEP_DIVE_PATH}/${topicId}`, body)
      .pipe(
        catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
      );
  }

  deleteDeepDive(topicId: string): Observable<DeleteDeepDiveResponse> {
    return this.http.delete<DeleteDeepDiveResponse>(`${DEEP_DIVE_PATH}/${topicId}`).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }
}
