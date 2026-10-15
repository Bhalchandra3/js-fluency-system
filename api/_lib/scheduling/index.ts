// api/_lib/scheduling/index.ts
// Pure Phase 3 scheduling helpers (G2 / G4 / G5). No database or HTTP I/O.

export { SchedulingError } from './errors.js';

export {
    INTERVAL_LADDER,
    assertLadderInterval,
    isLadderInterval,
    advanceInterval,
    reinforceInterval,
    resetInterval,
    type LadderInterval,
} from './intervalLadder.js';

export {
    SchedulingOutcome,
    G5_POLICY_VERSION,
    aggregateG5SessionOutcome,
    type SessionAnswerInput,
    type G5AggregationResult,
} from './g5Aggregation.js';

export {
    USER_TIME_ZONE,
    getKolkataCalendarDate,
    kolkataCalendarDateToUtcInstant,
    addCalendarDays,
    compareCalendarDates,
    formatCalendarDate,
    computeNextRevisionAt,
    isRevisionDue,
    isRevisionOverdue,
    classifyRevisionDue,
    compareRevisionPriority,
    type CalendarDate,
    type DueClassification,
} from './calendarDay.js';
