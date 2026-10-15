// api/_lib/scheduling/calendarDay.ts

import { SchedulingError } from './errors.js';
import { assertLadderInterval, type LadderInterval } from './intervalLadder.js';

/**
 * Phase 3 fixed user calendar zone (G2).
 * Asia/Kolkata has no DST and is permanently UTC+05:30.
 */
export const USER_TIME_ZONE = 'Asia/Kolkata';

/** Civil calendar date in the user timezone (month is 1–12). */
export type CalendarDate = {
    year: number;
    month: number;
    day: number;
};

const KOLKATA_OFFSET = '+05:30';

function assertValidDate(value: Date, label: string): Date {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new SchedulingError(
            'INVALID_DATE',
            `${label} must be a valid Date (UTC instant)`,
        );
    }

    return value;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * Derive the Asia/Kolkata calendar date from a stored UTC instant.
 * Uses Intl with an explicit timeZone — independent of the host TZ.
 */
export function getKolkataCalendarDate(instant: Date): CalendarDate {
    assertValidDate(instant, 'instant');

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: USER_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(instant);

    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        throw new SchedulingError(
            'INVALID_DATE',
            'Failed to derive Asia/Kolkata calendar date from instant',
        );
    }

    return { year, month, day };
}

/**
 * UTC instant corresponding to local midnight at the start of the given
 * Asia/Kolkata calendar date. Safe because Kolkata has no DST.
 */
export function kolkataCalendarDateToUtcInstant(date: CalendarDate): Date {
    const { year, month, day } = date;

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
    ) {
        throw new SchedulingError(
            'INVALID_CALENDAR_DATE',
            `Invalid calendar date ${year}-${month}-${day}`,
        );
    }

    const iso = `${year}-${pad2(month)}-${pad2(day)}T00:00:00${KOLKATA_OFFSET}`;
    const instant = new Date(iso);

    if (Number.isNaN(instant.getTime())) {
        throw new SchedulingError(
            'INVALID_CALENDAR_DATE',
            `Invalid calendar date ${iso}`,
        );
    }

    // Reject overflow dates (e.g. Feb 31) by round-tripping through Kolkata parts.
    const roundTrip = getKolkataCalendarDate(instant);
    if (
        roundTrip.year !== year ||
        roundTrip.month !== month ||
        roundTrip.day !== day
    ) {
        throw new SchedulingError(
            'INVALID_CALENDAR_DATE',
            `Invalid calendar date ${year}-${pad2(month)}-${pad2(day)}`,
        );
    }

    return instant;
}

/**
 * Civil calendar-day arithmetic (not N×24h). Month/year rollover uses UTC date math
 * on Y-M-D components only.
 */
export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
    if (!Number.isInteger(days)) {
        throw new SchedulingError(
            'INVALID_DAY_COUNT',
            `days must be an integer; received ${String(days)}`,
        );
    }

    const utcNoon = Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0);
    const shifted = new Date(utcNoon + days * 24 * 60 * 60 * 1000);

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
    };
}

/** Compare two calendar dates: -1 if a < b, 0 if equal, 1 if a > b. */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
    if (a.year !== b.year) {
        return a.year < b.year ? -1 : 1;
    }

    if (a.month !== b.month) {
        return a.month < b.month ? -1 : 1;
    }

    if (a.day !== b.day) {
        return a.day < b.day ? -1 : 1;
    }

    return 0;
}

export function formatCalendarDate(date: CalendarDate): string {
    return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

/**
 * Next revision UTC instant = Asia/Kolkata midnight on (reference Kolkata date + intervalDays).
 * `intervalDays` must be a ladder value.
 */
export function computeNextRevisionAt(
    referenceInstant: Date,
    intervalDays: number,
): Date {
    assertValidDate(referenceInstant, 'referenceInstant');
    const interval = assertLadderInterval(intervalDays);
    const start = getKolkataCalendarDate(referenceInstant);
    const due = addCalendarDays(start, interval);
    return kolkataCalendarDateToUtcInstant(due);
}

/**
 * Topic is due when due calendar date (Kolkata) ≤ today (Kolkata).
 * Due set includes overdue topics (G2).
 */
export function isRevisionDue(nextRevisionAt: Date, now: Date): boolean {
    assertValidDate(nextRevisionAt, 'nextRevisionAt');
    assertValidDate(now, 'now');

    return (
        compareCalendarDates(
            getKolkataCalendarDate(nextRevisionAt),
            getKolkataCalendarDate(now),
        ) <= 0
    );
}

/**
 * Topic is overdue when due calendar date (Kolkata) < today (Kolkata).
 */
export function isRevisionOverdue(nextRevisionAt: Date, now: Date): boolean {
    assertValidDate(nextRevisionAt, 'nextRevisionAt');
    assertValidDate(now, 'now');

    return (
        compareCalendarDates(
            getKolkataCalendarDate(nextRevisionAt),
            getKolkataCalendarDate(now),
        ) < 0
    );
}

export type DueClassification = 'overdue' | 'due_today' | 'future';

export function classifyRevisionDue(
    nextRevisionAt: Date,
    now: Date,
): DueClassification {
    if (isRevisionOverdue(nextRevisionAt, now)) {
        return 'overdue';
    }

    if (isRevisionDue(nextRevisionAt, now)) {
        return 'due_today';
    }

    return 'future';
}

/**
 * G2 ordering: overdue first, then due date ascending (oldest first),
 * then name, then id for stable ties.
 */
export function compareRevisionPriority(
    a: { nextRevisionAt: Date; name?: string; id?: string },
    b: { nextRevisionAt: Date; name?: string; id?: string },
    now: Date,
): number {
    const aOverdue = isRevisionOverdue(a.nextRevisionAt, now) ? 0 : 1;
    const bOverdue = isRevisionOverdue(b.nextRevisionAt, now) ? 0 : 1;

    if (aOverdue !== bOverdue) {
        return aOverdue - bOverdue;
    }

    const byDate = compareCalendarDates(
        getKolkataCalendarDate(a.nextRevisionAt),
        getKolkataCalendarDate(b.nextRevisionAt),
    );

    if (byDate !== 0) {
        return byDate;
    }

    const byName = (a.name ?? '').localeCompare(b.name ?? '');
    if (byName !== 0) {
        return byName;
    }

    return (a.id ?? '').localeCompare(b.id ?? '');
}

export type { LadderInterval };
