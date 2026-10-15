// api/_lib/scheduling/errors.ts

/**
 * Thrown for invalid scheduling inputs (interval, answers, confidence, dates).
 * Pure helpers never touch the database or HTTP layer.
 */
export class SchedulingError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = 'SchedulingError';
        this.code = code;
    }
}
