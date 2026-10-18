import { HttpErrorResponse } from '@angular/common/http';

import { normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
  it('maps backend 400/401/404/409 messages safely', () => {
    expect(
      normalizeApiError(
        new HttpErrorResponse({
          status: 400,
          error: { status: 'error', message: 'invalid confidence' },
        }),
      ).message,
    ).toBe('invalid confidence');

    expect(
      normalizeApiError(
        new HttpErrorResponse({
          status: 401,
          error: { status: 'error', message: 'Unauthorized' },
        }),
      ).statusCode,
    ).toBe(401);

    expect(
      normalizeApiError(
        new HttpErrorResponse({
          status: 404,
          error: { status: 'error', message: 'Session not found' },
        }),
      ).message,
    ).toBe('Session not found');

    expect(
      normalizeApiError(
        new HttpErrorResponse({
          status: 409,
          error: { status: 'error', message: 'Session is already completed' },
        }),
      ).message,
    ).toBe('Session is already completed');
  });

  it('uses a generic message for 500 and network failures', () => {
    expect(
      normalizeApiError(
        new HttpErrorResponse({
          status: 500,
          error: { status: 'error', message: 'SQL boom password=secret' },
        }),
      ).message,
    ).toBe('A server error occurred. Please try again later.');

    expect(
      normalizeApiError(new HttpErrorResponse({ status: 0, statusText: 'Unknown' })).message,
    ).toContain('Network error');
  });
});
