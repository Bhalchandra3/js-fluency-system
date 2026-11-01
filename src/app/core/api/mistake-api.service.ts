import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiClientError, normalizeApiError } from './api-error';
import {
  CreateMistakeRequestBody,
  ListMistakesQuery,
  ListMistakesResponse,
  MistakeDetailResponse,
  UpdateMistakeRequestBody,
} from './mistake.types';

const MISTAKES_PATH = '/api/mistakes';

/**
 * Typed client for Phase 4 Mistake Log APIs.
 * Auth headers are supplied by `authInterceptor` — not duplicated here.
 */
@Injectable({ providedIn: 'root' })
export class MistakeApiService {
  private readonly http = inject(HttpClient);

  listMistakes(query: ListMistakesQuery = {}): Observable<ListMistakesResponse> {
    return this.http
      .get<ListMistakesResponse>(MISTAKES_PATH, {
        params: buildListMistakesParams(query),
      })
      .pipe(
        catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
      );
  }

  getMistake(id: string): Observable<MistakeDetailResponse> {
    return this.http.get<MistakeDetailResponse>(`${MISTAKES_PATH}/${id}`).pipe(
      catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
    );
  }

  createMistake(body: CreateMistakeRequestBody): Observable<MistakeDetailResponse> {
    return this.http
      .post<MistakeDetailResponse>(MISTAKES_PATH, buildCreateMistakeBody(body))
      .pipe(
        catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
      );
  }

  updateMistake(
    id: string,
    body: UpdateMistakeRequestBody,
  ): Observable<MistakeDetailResponse> {
    return this.http
      .patch<MistakeDetailResponse>(`${MISTAKES_PATH}/${id}`, body)
      .pipe(
        catchError((error) => throwError(() => new ApiClientError(normalizeApiError(error)))),
      );
  }
}

/** Build query params; omit unset fields so backend defaults apply. */
export function buildListMistakesParams(query: ListMistakesQuery): HttpParams {
  let params = new HttpParams();
  if (query.topicId !== undefined) {
    params = params.set('topicId', query.topicId);
  }
  if (query.unresolvedOnly !== undefined) {
    params = params.set('unresolvedOnly', String(query.unresolvedOnly));
  }
  if (query.limit !== undefined) {
    params = params.set('limit', String(query.limit));
  }
  if (query.offset !== undefined) {
    params = params.set('offset', String(query.offset));
  }
  return params;
}

/** Omit optional `questionId` when unset (backend rejects null/empty). */
export function buildCreateMistakeBody(
  body: CreateMistakeRequestBody,
): CreateMistakeRequestBody {
  const payload: CreateMistakeRequestBody = {
    topicId: body.topicId,
    mistakeText: body.mistakeText,
    correctUnderstanding: body.correctUnderstanding,
  };
  if (body.questionId !== undefined) {
    payload.questionId = body.questionId;
  }
  return payload;
}
