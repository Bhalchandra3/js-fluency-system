import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiClientError, normalizeApiError } from './api-error';
import { ListTopicsResponse } from './topics.types';

const TOPICS_PATH = '/api/topics';

/**
 * Typed client for GET /api/topics.
 * Used by Mistake Log create (topic select) and list name mapping.
 * Auth headers are supplied by `authInterceptor` — not duplicated here.
 */
@Injectable({ providedIn: 'root' })
export class TopicsApiService {
  private readonly http = inject(HttpClient);

  listTopics(): Observable<ListTopicsResponse> {
    return this.http.get<ListTopicsResponse>(TOPICS_PATH).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }
}
