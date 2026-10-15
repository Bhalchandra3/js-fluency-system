// api/_lib/scheduling/intervalLadder.test.ts

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SchedulingError } from './errors.js';
import {
    INTERVAL_LADDER,
    advanceInterval,
    assertLadderInterval,
    reinforceInterval,
    resetInterval,
} from './intervalLadder.js';

describe('interval ladder (G4)', () => {
    it('exposes the canonical sequence', () => {
        assert.deepEqual([...INTERVAL_LADDER], [1, 3, 7, 14, 30]);
    });

    it('advances every forward transition', () => {
        assert.equal(advanceInterval(1), 3);
        assert.equal(advanceInterval(3), 7);
        assert.equal(advanceInterval(7), 14);
        assert.equal(advanceInterval(14), 30);
    });

    it('caps advance at 30', () => {
        assert.equal(advanceInterval(30), 30);
    });

    it('reinforces every backward transition', () => {
        assert.equal(reinforceInterval(30), 14);
        assert.equal(reinforceInterval(14), 7);
        assert.equal(reinforceInterval(7), 3);
        assert.equal(reinforceInterval(3), 1);
    });

    it('floors reinforce at 1', () => {
        assert.equal(reinforceInterval(1), 1);
    });

    it('resets from every valid interval to 1', () => {
        for (const interval of INTERVAL_LADDER) {
            assert.equal(resetInterval(interval), 1);
        }
    });

    it('rejects invalid intervals without normalizing', () => {
        for (const invalid of [0, 2, 4, 10, 15, 29, 31, 1.5, NaN, Infinity]) {
            assert.throws(
                () => assertLadderInterval(invalid),
                (error: unknown) =>
                    error instanceof SchedulingError &&
                    error.code === 'INVALID_INTERVAL',
            );
            assert.throws(() => advanceInterval(invalid), SchedulingError);
            assert.throws(() => reinforceInterval(invalid), SchedulingError);
            assert.throws(() => resetInterval(invalid), SchedulingError);
        }
    });
});
