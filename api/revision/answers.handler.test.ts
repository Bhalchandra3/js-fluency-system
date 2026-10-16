// api/revision/answers.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleRevisionAnswers } from './answers.js';
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

describe('POST /api/revision/answers handler', () => {
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
        await handleRevisionAnswers(mockReq('POST', {}), res, {
            prisma: {} as never,
            submitRevisionAnswer: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for non-POST', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleRevisionAnswers(mockReq('GET', {}, 'Bearer tok'), res, {
            prisma: {} as never,
            submitRevisionAnswer: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 405);
    });

    it('maps RevisionApiError to status envelope', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleRevisionAnswers(mockReq('POST', {}, 'Bearer tok'), res, {
            prisma: {} as never,
            submitRevisionAnswer: async () => {
                throw new RevisionApiError(409, 'Session is already completed');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 409);
        assert.deepEqual(res.body, {
            status: 'error',
            message: 'Session is already completed',
        });
    });

    it('returns 200 on success', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = {
            status: 'ok' as const,
            correct: true,
            progress: { answered: 1, total: 2 },
            sessionStatus: 'OPEN' as const,
            canComplete: false,
        };
        await handleRevisionAnswers(mockReq('POST', { sessionId: 's' }, 'Bearer tok'), res, {
            prisma: {} as never,
            submitRevisionAnswer: async () => payload,
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });

    it('returns 500 for unexpected errors', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleRevisionAnswers(mockReq('POST', {}, 'Bearer tok'), res, {
            prisma: {} as never,
            submitRevisionAnswer: async () => {
                throw new Error('boom');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, { status: 'error', message: 'boom' });
    });
});
