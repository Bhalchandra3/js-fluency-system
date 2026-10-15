// api/_lib/scheduling/intervalLadder.ts

import { SchedulingError } from './errors.js';

/** Canonical discrete revision interval ladder (G4). Days are calendar days. */
export const INTERVAL_LADDER = [1, 3, 7, 14, 30] as const;

export type LadderInterval = (typeof INTERVAL_LADDER)[number];

const LADDER_SET = new Set<number>(INTERVAL_LADDER);

export function isLadderInterval(value: number): value is LadderInterval {
    return LADDER_SET.has(value);
}

/**
 * Validates that `intervalDays` is exactly one of 1 | 3 | 7 | 14 | 30.
 * Does not silently normalize invalid values.
 */
export function assertLadderInterval(intervalDays: number): LadderInterval {
    if (typeof intervalDays !== 'number' || !Number.isInteger(intervalDays)) {
        throw new SchedulingError(
            'INVALID_INTERVAL',
            `intervalDays must be an integer ladder value; received ${String(intervalDays)}`,
        );
    }

    if (!isLadderInterval(intervalDays)) {
        throw new SchedulingError(
            'INVALID_INTERVAL',
            `Unsupported intervalDays ${intervalDays}. Allowed: ${INTERVAL_LADDER.join(', ')}`,
        );
    }

    return intervalDays;
}

/** Move forward exactly one ladder level; cap at 30. */
export function advanceInterval(intervalDays: number): LadderInterval {
    const current = assertLadderInterval(intervalDays);
    const index = INTERVAL_LADDER.indexOf(current);

    if (index === INTERVAL_LADDER.length - 1) {
        return INTERVAL_LADDER[index];
    }

    return INTERVAL_LADDER[index + 1];
}

/** Move backward exactly one ladder level; floor at 1. */
export function reinforceInterval(intervalDays: number): LadderInterval {
    const current = assertLadderInterval(intervalDays);
    const index = INTERVAL_LADDER.indexOf(current);

    if (index === 0) {
        return INTERVAL_LADDER[0];
    }

    return INTERVAL_LADDER[index - 1];
}

/** Return directly to 1 day regardless of current interval. */
export function resetInterval(intervalDays: number): LadderInterval {
    assertLadderInterval(intervalDays);
    return 1;
}
