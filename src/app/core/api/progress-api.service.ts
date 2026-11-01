import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiClientError, normalizeApiError } from './api-error';
import { ProgressSummaryResponse } from './progress.types';

const PROGRESS_PATH = '/api/progress';

/**
 * Typed client for Phase 4 progress / dashboard summary API.
 * Auth headers are supplied by `authInterceptor` — not duplicated here.
 */
@Injectable({ providedIn: 'root' })
export class ProgressApiService {
  private readonly http = inject(HttpClient);

  getProgress(): Observable<ProgressSummaryResponse> {
    return this.http.get<ProgressSummaryResponse>(PROGRESS_PATH).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }
}
