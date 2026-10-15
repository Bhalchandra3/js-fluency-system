// prisma/openSessionQuestionGuard.test.ts

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOpenSessionQuestionMutationError } from './openSessionQuestionGuard.js';

describe('openSessionQuestionGuard', () => {
    it('formats an actionable error that fails the seed instead of silent skip', () => {
        const error = formatOpenSessionQuestionMutationError(
            { questionId: 'q1', sessionId: 's1' },
            'questions.json[3] (topicSlug=closures)',
        );

        assert.match(error.message, /cannot update question id=q1/);
        assert.match(error.message, /OPEN revision session id=s1/);
        assert.match(error.message, /questions\.json\[3]/);
    });
});
