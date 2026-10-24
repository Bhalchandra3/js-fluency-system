// api/revision/complete.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleRevisionComplete } from './complete.js';
import { RevisionApiError } from '../_lib/revision/errors.js';

type MockRes = VercelResponse & { statusCode: number; body: unknown };

function mockRes(): MockRes {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
    };
    return res as MockRes;
}

function mockReq(method: string, body?: unknown, authorization?: string): VercelRequest {
    return {
        method,
        body,
        headers: authorization ? { authorization } : {},
    } as VercelRequest;
}

describe('POST /api/revision/complete handler', () => {
    const previousToken = process.env['BEARER_TOKEN'];

    afterEach(() => {
        if (previousToken === undefined) {
            delete process.env['BEARER_TOKEN'];
        } else {
            process.env['BEARER_TOKEN'] = previousToken;
        }
    });

    it('returns 401 without bearer token', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleRevisionComplete(mockReq('POST', {}), res, {
            prisma: {} as never,
            completeRevisionSession: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for non-POST', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleRevisionComplete(mockReq('GET', {}, 'Bearer tok'), res, {
            prisma: {} as never,
            completeRevisionSession: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 405);
    });

    it('maps RevisionApiError to status envelope', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleRevisionComplete(mockReq('POST', {}, 'Bearer tok'), res, {
            prisma: {} as never,
            completeRevisionSession: async () => {
                throw new RevisionApiError(409, 'Session has unanswered questions');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 409);
    });

    it('returns 200 on success', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = {
            status: 'ok' as const,
            sessionStatus: 'COMPLETED' as const,
            scheduling: {
                outcome: 'ADVANCE' as const,
                previousIntervalDays: 1,
                resultingIntervalDays: 3,
                resultingNextRevisionDate: '2026-10-16T18:30:00.000Z',
                policyVersion: 'phase3-g5-v1',
                reason: 'Advance one ladder step; all answers correct with OKAY or EASY confidence',
            },
            topicStatus: {
                previous: 'RED' as const,
                current: 'GREEN' as const,
                policyVersion: 'phase4-status-v1' as const,
                reason: 'Status GREEN (was RED) because session outcome ADVANCE — strong enough this session',
                deepDiveEnsured: false,
            },
            mistakesCreated: 0,
        };
        await handleRevisionComplete(mockReq('POST', { sessionId: 's' }, 'Bearer tok'), res, {
            prisma: {} as never,
            completeRevisionSession: async () => payload,
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });
});
