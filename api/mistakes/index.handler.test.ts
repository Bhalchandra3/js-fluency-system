// api/mistakes/index.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMistakesCollection } from './index.js';
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
        query: options?.query ?? {},
        headers: options?.authorization ? { authorization: options.authorization } : {},
    } as VercelRequest;
}

describe('GET|POST /api/mistakes handler', () => {
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
        await handleMistakesCollection(mockReq('GET'), res, {
            prisma: {} as never,
            listMistakes: async () => {
                throw new Error('no');
            },
            createMistake: async () => {
                throw new Error('no');
            },
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 401 for invalid bearer token', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleMistakesCollection(
            mockReq('GET', { authorization: 'Bearer wrong' }),
            res,
            {
                prisma: {} as never,
                listMistakes: async () => {
                    throw new Error('no');
                },
                createMistake: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for unsupported method', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleMistakesCollection(
            mockReq('DELETE', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                listMistakes: async () => {
                    throw new Error('no');
                },
                createMistake: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 405);
    });

    it('maps MistakeApiError to status envelope', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleMistakesCollection(
            mockReq('GET', {
                authorization: 'Bearer tok',
                query: { limit: '999' },
            }),
            res,
            {
                prisma: {} as never,
                listMistakes: async () => {
                    throw new MistakeApiError(400, 'limit must be between 1 and 200');
                },
                createMistake: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, {
            status: 'error',
            message: 'limit must be between 1 and 200',
        });
    });

    it('returns 200 list payload on GET', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = { status: 'ok' as const, mistakes: [], total: 0 };
        await handleMistakesCollection(
            mockReq('GET', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                listMistakes: async () => payload,
                createMistake: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });

    it('returns 200 create payload on POST', async () => {
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
        await handleMistakesCollection(
            mockReq('POST', {
                authorization: 'Bearer tok',
                body: {
                    topicId: 't1',
                    mistakeText: 'x',
                    correctUnderstanding: 'y',
                },
            }),
            res,
            {
                prisma: {} as never,
                listMistakes: async () => {
                    throw new Error('no');
                },
                createMistake: async () => payload,
            },
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });
});
