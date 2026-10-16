// api/_lib/revision/errors.ts

/**
 * Typed HTTP-facing error for revision write APIs.
 * Handlers map statusCode → JSON envelope.
 */
export class RevisionApiError extends Error {
    readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = 'RevisionApiError';
        this.statusCode = statusCode;
    }
}
