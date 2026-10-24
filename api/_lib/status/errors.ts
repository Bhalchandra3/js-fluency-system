// api/_lib/status/errors.ts

/**
 * Thrown for invalid status-policy inputs (outcome, TopicStatus).
 * Pure helpers never touch the database or HTTP layer.
 */
export class StatusError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'StatusError';
        this.code = code;
    }
}
