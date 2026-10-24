// api/_lib/mistakes/errors.ts

/**
 * Typed HTTP-facing error for Mistake Log APIs.
 * Handlers map statusCode → JSON envelope.
 */
export class MistakeApiError extends Error {
    readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = 'MistakeApiError';
        this.statusCode = statusCode;
    }
}
