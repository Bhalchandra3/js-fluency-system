// api/mistakes/id.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMistakeById } from './[id].js';
import { MistakeApiError } from '../_lib/mistakes/errors.js';

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

function mockReq(
    method: string,
    options?: { body?: unknown; query?: Record<string, unknown>; authorization?: string },
): VercelRequest {
    return {
        method,
        body: options?.body,
        query: options?.query ?? { id: 'm1' },
        headers: options?.authorization ? { authorization: options.authorization } : {},
    } as VercelRequest;
}

describe('GET|PATCH /api/mistakes/[id] handler', () => {
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
        await handleMistakeById(mockReq('GET'), res, {
            prisma: {} as never,
            getMistakeById: async () => {
                throw new Error('no');
            },
            updateMistake: async () => {
                throw new Error('no');
            },
            now: () => new Date(),
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for unsupported method', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleMistakeById(
            mockReq('POST', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                getMistakeById: async () => {
                    throw new Error('no');
                },
                updateMistake: async () => {
                    throw new Error('no');
                },
                now: () => new Date(),
            },
        );
        assert.equal(res.statusCode, 405);
    });

    it('maps 404 MistakeApiError', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleMistakeById(
            mockReq('GET', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                getMistakeById: async () => {
                    throw new MistakeApiError(404, 'Mistake not found');
                },
                updateMistake: async () => {
                    throw new Error('no');
                },
                now: () => new Date(),
            },
        );
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, {
            status: 'error',
            message: 'Mistake not found',
        });
    });

    it('returns 200 detail on GET', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = {
            status: 'ok' as const,
            mistake: {
                id: 'm1',
                topicId: 't1',
                questionId: null,
                sessionId: null,
                sourceSessionLogId: null,
                mistakeText: 'x',
                correctUnderstanding: 'y',
                turnedIntoQuestion: false,
                resolvedAt: null,
                createdAt: '2026-10-24T00:00:00.000Z',
                topic: { id: 't1', name: 'Closures', slug: 'closures' },
            },
        };
        await handleMistakeById(
            mockReq('GET', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                getMistakeById: async () => payload,
                updateMistake: async () => {
                    throw new Error('no');
                },
                now: () => new Date(),
            },
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });

    it('returns 200 on PATCH', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = {
            status: 'ok' as const,
            mistake: {
                id: 'm1',
                topicId: 't1',
                questionId: null,
                sessionId: null,
                sourceSessionLogId: null,
                mistakeText: 'updated',
                correctUnderstanding: 'y',
                turnedIntoQuestion: false,
                resolvedAt: '2026-10-24T12:00:00.000Z',
                createdAt: '2026-10-24T00:00:00.000Z',
                topic: { id: 't1', name: 'Closures', slug: 'closures' },
            },
        };
        await handleMistakeById(
            mockReq('PATCH', {
                authorization: 'Bearer tok',
                body: { mistakeText: 'updated', resolved: true },
            }),
            res,
            {
                prisma: {} as never,
                getMistakeById: async () => {
                    throw new Error('no');
                },
                updateMistake: async () => payload,
                now: () => new Date(),
            },
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });
});
