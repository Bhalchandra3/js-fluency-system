import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorBody = {
  status: 'error';
  message: string;
};

export type NormalizedApiError = {
  statusCode: number | null;
  message: string;
  /** True when the backend body matched `{ status: 'error', message: string }`. */
  fromBackend: boolean;
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record['status'] === 'error' && typeof record['message'] === 'string';
}

function safeBackendMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return 'Something went wrong. Please try again.';
  }
  // Avoid surfacing obvious internals if a handler ever leaks them.
  if (/password|bearer|authorization|database|sql|stack/i.test(trimmed)) {
    return 'Something went wrong. Please try again.';
  }
  return trimmed;
}

/**
 * Normalize Angular HttpErrorResponse (and unknown errors) for UI/services.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof HttpErrorResponse) {
    const statusCode = error.status > 0 ? error.status : null;
    const backend = isApiErrorBody(error.error) ? error.error : null;

    if (statusCode === 401) {
      return {
        statusCode,
        message: backend
          ? safeBackendMessage(backend.message)
          : 'Authentication required. Please save a valid access token.',
        fromBackend: backend !== null,
      };
    }

    if (statusCode === 400) {
      return {
        statusCode,
        message: backend
          ? safeBackendMessage(backend.message)
          : 'The request was invalid. Check your input and try again.',
        fromBackend: backend !== null,
      };
    }

    if (statusCode === 404) {
      return {
        statusCode,
        message: backend
          ? safeBackendMessage(backend.message)
          : 'The requested resource was not found.',
        fromBackend: backend !== null,
      };
    }

    if (statusCode === 409) {
      return {
        statusCode,
        message: backend
          ? safeBackendMessage(backend.message)
          : 'This revision session cannot be updated in its current state.',
        fromBackend: backend !== null,
      };
    }

    if (statusCode === 405) {
      return {
        statusCode,
        message: backend
          ? safeBackendMessage(backend.message)
          : 'This action is not supported.',
        fromBackend: backend !== null,
      };
    }

    if (statusCode === 500) {
      return {
        statusCode,
        message: 'A server error occurred. Please try again later.',
        fromBackend: false,
      };
    }

    if (statusCode === null) {
      return {
        statusCode: null,
        message: 'Network error. Check your connection and try again.',
        fromBackend: false,
      };
    }

    return {
      statusCode,
      message: backend
        ? safeBackendMessage(backend.message)
        : 'Something went wrong. Please try again.',
      fromBackend: backend !== null,
    };
  }

  return {
    statusCode: null,
    message: 'Something went wrong. Please try again.',
    fromBackend: false,
  };
}

export class ApiClientError extends Error {
  readonly statusCode: number | null;
  readonly fromBackend: boolean;

  constructor(normalized: NormalizedApiError) {
    super(normalized.message);
    this.name = 'ApiClientError';
    this.statusCode = normalized.statusCode;
    this.fromBackend = normalized.fromBackend;
  }
}
