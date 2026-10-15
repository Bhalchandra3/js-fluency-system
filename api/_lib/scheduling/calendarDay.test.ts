// api/_lib/scheduling/calendarDay.test.ts

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SchedulingError } from './errors.js';
import {
    USER_TIME_ZONE,
    addCalendarDays,
    classifyRevisionDue,
    compareRevisionPriority,
    computeNextRevisionAt,
    formatCalendarDate,
    getKolkataCalendarDate,
    isRevisionDue,
    isRevisionOverdue,
    kolkataCalendarDateToUtcInstant,
} from './calendarDay.js';

describe('Asia/Kolkata calendar-day helpers (G2)', () => {
    it('uses Asia/Kolkata as the fixed user zone', () => {
        assert.equal(USER_TIME_ZONE, 'Asia/Kolkata');
    });

    it('maps a UTC instant near UTC midnight to the correct Kolkata date', () => {
        // 2026-03-14T18:30:00.000Z == 2026-03-15 00:00 IST
        const kolkataMidnight = new Date('2026-03-14T18:30:00.000Z');
        assert.deepEqual(getKolkataCalendarDate(kolkataMidnight), {
            year: 2026,
            month: 3,
            day: 15,
        });

        // One millisecond earlier is still 14 March IST
        const previous = new Date('2026-03-14T18:29:59.999Z');
        assert.deepEqual(getKolkataCalendarDate(previous), {
            year: 2026,
            month: 3,
            day: 14,
        });
    });

    it('converts Kolkata calendar dates to UTC midnight instants', () => {
        const instant = kolkataCalendarDateToUtcInstant({
            year: 2026,
            month: 3,
            day: 15,
        });
        assert.equal(instant.toISOString(), '2026-03-14T18:30:00.000Z');
    });

    it('adds one calendar day across midnight (not +24h on an arbitrary instant)', () => {
        // 15 Mar 2026 23:30 IST = 15 Mar 18:00 UTC
        const lateIst = new Date('2026-03-15T18:00:00.000Z');
        const next = computeNextRevisionAt(lateIst, 1);
        // Reference Kolkata date is 15 Mar; +1 day → 16 Mar 00:00 IST
        assert.equal(next.toISOString(), '2026-03-15T18:30:00.000Z');
        assert.deepEqual(getKolkataCalendarDate(next), {
            year: 2026,
            month: 3,
            day: 16,
        });
    });

    it('adds multiple calendar days using civil arithmetic', () => {
        assert.deepEqual(
            addCalendarDays({ year: 2026, month: 3, day: 15 }, 7),
            { year: 2026, month: 3, day: 22 },
        );
        assert.equal(
            formatCalendarDate(
                addCalendarDays({ year: 2026, month: 1, day: 28 }, 5),
            ),
            '2026-02-02',
        );
    });

    it('handles month-end and year-end rollover', () => {
        assert.deepEqual(addCalendarDays({ year: 2026, month: 1, day: 31 }, 1), {
            year: 2026,
            month: 2,
            day: 1,
        });
        assert.deepEqual(addCalendarDays({ year: 2026, month: 12, day: 31 }, 1), {
            year: 2027,
            month: 1,
            day: 1,
        });
        assert.equal(
            computeNextRevisionAt(
                kolkataCalendarDateToUtcInstant({ year: 2026, month: 12, day: 30 }),
                3,
            ).toISOString(),
            '2027-01-01T18:30:00.000Z', // 2 Jan 2027 00:00 IST
        );
    });

    it('classifies due today, overdue, and future by Kolkata calendar date', () => {
        const now = new Date('2026-06-10T06:00:00.000Z'); // 10 Jun 2026 11:30 IST
        const dueToday = kolkataCalendarDateToUtcInstant({
            year: 2026,
            month: 6,
            day: 10,
        });
        const overdue = kolkataCalendarDateToUtcInstant({
            year: 2026,
            month: 6,
            day: 9,
        });
        const future = kolkataCalendarDateToUtcInstant({
            year: 2026,
            month: 6,
            day: 11,
        });

        assert.equal(classifyRevisionDue(dueToday, now), 'due_today');
        assert.equal(isRevisionDue(dueToday, now), true);
        assert.equal(isRevisionOverdue(dueToday, now), false);

        assert.equal(classifyRevisionDue(overdue, now), 'overdue');
        assert.equal(isRevisionDue(overdue, now), true);
        assert.equal(isRevisionOverdue(overdue, now), true);

        assert.equal(classifyRevisionDue(future, now), 'future');
        assert.equal(isRevisionDue(future, now), false);
        assert.equal(isRevisionOverdue(future, now), false);
    });

    it('treats UTC midnight that is still previous evening in Kolkata correctly', () => {
        // 2026-06-10T00:00:00.000Z == 2026-06-10 05:30 IST → calendar 10 Jun
        const utcMidnight = new Date('2026-06-10T00:00:00.000Z');
        assert.deepEqual(getKolkataCalendarDate(utcMidnight), {
            year: 2026,
            month: 6,
            day: 10,
        });

        // 2026-06-09T20:00:00.000Z == 2026-06-10 01:30 IST → calendar 10 Jun
        const stillTenth = new Date('2026-06-09T20:00:00.000Z');
        assert.deepEqual(getKolkataCalendarDate(stillTenth), {
            year: 2026,
            month: 6,
            day: 10,
        });
    });

    it('orders overdue before due-today, then by oldest due date', () => {
        const now = new Date('2026-06-10T06:00:00.000Z');
        const topics = [
            {
                id: 'b',
                name: 'Beta',
                nextRevisionAt: kolkataCalendarDateToUtcInstant({
                    year: 2026,
                    month: 6,
                    day: 10,
                }),
            },
            {
                id: 'a',
                name: 'Alpha',
                nextRevisionAt: kolkataCalendarDateToUtcInstant({
                    year: 2026,
                    month: 6,
                    day: 8,
                }),
            },
            {
                id: 'c',
                name: 'Gamma',
                nextRevisionAt: kolkataCalendarDateToUtcInstant({
                    year: 2026,
                    month: 6,
                    day: 9,
                }),
            },
        ];

        const ordered = [...topics].sort((a, b) =>
            compareRevisionPriority(a, b, now),
        );
        assert.deepEqual(
            ordered.map((topic) => topic.id),
            ['a', 'c', 'b'],
        );
    });

    it('does not depend on process.env.TZ for calendar derivation', () => {
        const previous = process.env['TZ'];
        try {
            process.env['TZ'] = 'America/Los_Angeles';
            const instant = new Date('2026-03-14T18:30:00.000Z');
            assert.deepEqual(getKolkataCalendarDate(instant), {
                year: 2026,
                month: 3,
                day: 15,
            });

            process.env['TZ'] = 'Pacific/Kiritimati';
            assert.deepEqual(getKolkataCalendarDate(instant), {
                year: 2026,
                month: 3,
                day: 15,
            });
        } finally {
            if (previous === undefined) {
                delete process.env['TZ'];
            } else {
                process.env['TZ'] = previous;
            }
        }
    });

    it('rejects invalid dates and day counts', () => {
        assert.throws(
            () => getKolkataCalendarDate(new Date('not-a-date')),
            SchedulingError,
        );
        assert.throws(
            () => addCalendarDays({ year: 2026, month: 1, day: 1 }, 1.5),
            SchedulingError,
        );
        assert.throws(
            () =>
                kolkataCalendarDateToUtcInstant({
                    year: 2026,
                    month: 2,
                    day: 31,
                }),
            SchedulingError,
        );
    });
});
