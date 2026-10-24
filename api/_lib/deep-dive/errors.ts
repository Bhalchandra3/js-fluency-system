// api/_lib/deep-dive/errors.ts

/**
 * Typed HTTP-facing error for Deep Dive Queue APIs.
 * Handlers map statusCode → JSON envelope.
 */
export class DeepDiveApiError extends Error {
    readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = 'DeepDiveApiError';
        this.statusCode = statusCode;
    }
}
