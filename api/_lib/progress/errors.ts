// api/_lib/progress/errors.ts

/**
 * Typed HTTP-facing error for Progress summary APIs.
 * Handlers map statusCode → JSON envelope.
 */
export class ProgressApiError extends Error {
    readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = 'ProgressApiError';
        this.statusCode = statusCode;
    }
}
