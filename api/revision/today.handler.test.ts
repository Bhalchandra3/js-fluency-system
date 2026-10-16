// api/revision/today.handler.test.ts
// HTTP contract tests for GET /api/revision/today (no database).

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTodayRevision } from './today.js';
import type { TodayRevisionResponse } from '../_lib/revision/todayService.js';

type MockRes = VercelResponse & {
    statusCode: number;
    body: unknown;
};

function mockRes(): MockRes {
    const state: { statusCode: number; body: unknown } = {
        statusCode: 0,
        body: undefined,
    };

    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) {
            state.statusCode = code;
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            state.body = payload;
            this.body = payload;
            return this;
        },
    };

    return res as MockRes;
}

function mockReq(
    method: string,
    authorization?: string,
): VercelRequest {
    return {
        method,
        headers: authorization ? { authorization } : {},
    } as VercelRequest;
}

describe('GET /api/revision/today handler', () => {
    const previousToken = process.env['BEARER_TOKEN'];

    afterEach(() => {
        if (previousToken === undefined) {
            delete process.env['BEARER_TOKEN'];
        } else {
            process.env['BEARER_TOKEN'] = previousToken;
        }
    });

    it('returns 401 when bearer token is missing', async () => {
        process.env['BEARER_TOKEN'] = 'test-token';
        const res = mockRes();
        await handleTodayRevision(mockReq('GET'), res, {
            prisma: {} as never,
            getTodayRevision: async () => {
                throw new Error('should not call service');
            },
            now: () => new Date('2026-10-15T12:00:00.000Z'),
        });

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { status: 'error', message: 'Unauthorized' });
    });

    it('returns 401 when bearer token is invalid', async () => {
        process.env['BEARER_TOKEN'] = 'test-token';
        const res = mockRes();
        await handleTodayRevision(mockReq('GET', 'Bearer wrong'), res, {
            prisma: {} as never,
            getTodayRevision: async () => {
                throw new Error('should not call service');
            },
            now: () => new Date('2026-10-15T12:00:00.000Z'),
        });

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { status: 'error', message: 'Unauthorized' });
    });

    it('returns 405 for non-GET methods after auth', async () => {
        process.env['BEARER_TOKEN'] = 'test-token';
        const res = mockRes();
        await handleTodayRevision(mockReq('POST', 'Bearer test-token'), res, {
            prisma: {} as never,
            getTodayRevision: async () => {
                throw new Error('should not call service');
            },
            now: () => new Date('2026-10-15T12:00:00.000Z'),
        });

        assert.equal(res.statusCode, 405);
        assert.deepEqual(res.body, {
            status: 'error',
            message: 'Method not allowed',
        });
    });

    it('returns 500 with established error envelope on unexpected errors', async () => {
        process.env['BEARER_TOKEN'] = 'test-token';
        const res = mockRes();
        await handleTodayRevision(mockReq('GET', 'Bearer test-token'), res, {
            prisma: {} as never,
            getTodayRevision: async () => {
                throw new Error('db down');
            },
            now: () => new Date('2026-10-15T12:00:00.000Z'),
        });

        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, {
            status: 'error',
            message: 'db down',
        });
    });

    it('returns 200 with service payload for authenticated GET', async () => {
        process.env['BEARER_TOKEN'] = 'test-token';
        const payload: TodayRevisionResponse = {
            status: 'ok',
            dueCount: 0,
            overdueCount: 0,
            session: null,
        };
        const res = mockRes();
        await handleTodayRevision(mockReq('GET', 'Bearer test-token'), res, {
            prisma: {} as never,
            getTodayRevision: async () => payload,
            now: () => new Date('2026-10-15T12:00:00.000Z'),
        });

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });
});
