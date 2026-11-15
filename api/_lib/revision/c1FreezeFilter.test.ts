// Phase 7 C1 — freeze filter contract (no database).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QuestionFormat, SessionType } from '../../../generated/prisma/client.js';
import { REVISION_FREEZE_QUESTION_WHERE } from './todayService.js';

describe('Phase 7 C1 REVISION_FREEZE_QUESTION_WHERE', () => {
    it('locks new freezes to REVISION + MULTIPLE_CHOICE', () => {
        assert.equal(REVISION_FREEZE_QUESTION_WHERE.sessionType, SessionType.REVISION);
        assert.equal(REVISION_FREEZE_QUESTION_WHERE.format, QuestionFormat.MULTIPLE_CHOICE);
        assert.deepEqual(Object.keys(REVISION_FREEZE_QUESTION_WHERE).sort(), [
            'format',
            'sessionType',
        ]);
    });
});
