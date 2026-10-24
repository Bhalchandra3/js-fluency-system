// api/progress/index.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleProgress } from './index.js';
import { ProgressApiError } from '../_lib/progress/errors.js';

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

function mockReq(method: string, authorization?: string): VercelRequest {
    return {
        method,
        headers: authorization ? { authorization } : {},
    } as VercelRequest;
}

describe('GET /api/progress handler', () => {
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
        await handleProgress(mockReq('GET'), res, {
            prisma: {} as never,
            getProgressSummary: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 401 for invalid bearer token', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleProgress(mockReq('GET', 'Bearer wrong'), res, {
            prisma: {} as never,
            getProgressSummary: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for non-GET', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleProgress(mockReq('POST', 'Bearer tok'), res, {
            prisma: {} as never,
            getProgressSummary: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 405);
    });

    it('maps ProgressApiError to status envelope', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleProgress(mockReq('GET', 'Bearer tok'), res, {
            prisma: {} as never,
            getProgressSummary: async () => {
                throw new ProgressApiError(500, 'unexpected');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, { status: 'error', message: 'unexpected' });
    });

    it('returns 200 summary payload on GET', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = {
            status: 'ok' as const,
            statusCounts: { green: 1, yellow: 2, red: 3 },
            deepDiveCount: 4,
            unresolvedMistakeCount: 5,
            dueCount: 6,
            overdueCount: 2,
        };
        let capturedNow: Date | undefined;
        await handleProgress(mockReq('GET', 'Bearer tok'), res, {
            prisma: {} as never,
            getProgressSummary: async (_prisma, now) => {
                capturedNow = now;
                return payload;
            },
            now: () => new Date('2026-10-24T12:00:00.000Z'),
        });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
        assert.equal(
            capturedNow?.toISOString(),
            '2026-10-24T12:00:00.000Z',
        );
    });
});
