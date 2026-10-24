// api/deep-dive/topicId.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDeepDiveByTopic } from './[topicId].js';
import { DeepDiveApiError } from '../_lib/deep-dive/errors.js';

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
        query: options?.query ?? { topicId: 't1' },
        headers: options?.authorization ? { authorization: options.authorization } : {},
    } as VercelRequest;
}

describe('PATCH|DELETE /api/deep-dive/[topicId] handler', () => {
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
        await handleDeepDiveByTopic(mockReq('PATCH'), res, {
            prisma: {} as never,
            updateDeepDiveNote: async () => {
                throw new Error('no');
            },
            deleteDeepDiveNote: async () => {
                throw new Error('no');
            },
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for unsupported method', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleDeepDiveByTopic(
            mockReq('GET', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                updateDeepDiveNote: async () => {
                    throw new Error('no');
                },
                deleteDeepDiveNote: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 405);
    });

    it('maps 404 DeepDiveApiError on PATCH', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleDeepDiveByTopic(
            mockReq('PATCH', {
                authorization: 'Bearer tok',
                body: { reason: 'x' },
            }),
            res,
            {
                prisma: {} as never,
                updateDeepDiveNote: async () => {
                    throw new DeepDiveApiError(404, 'Deep Dive note not found');
                },
                deleteDeepDiveNote: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, {
            status: 'error',
            message: 'Deep Dive note not found',
        });
    });

    it('returns 200 on PATCH', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = {
            status: 'ok' as const,
            note: {
                id: 'n1',
                topicId: 't1',
                reason: 'updated',
                notes: 'owner notes',
                createdAt: '2026-10-24T00:00:00.000Z',
                updatedAt: '2026-10-24T12:00:00.000Z',
                topic: {
                    id: 't1',
                    name: 'Closures',
                    slug: 'closures',
                    status: 'RED' as const,
                },
            },
        };
        await handleDeepDiveByTopic(
            mockReq('PATCH', {
                authorization: 'Bearer tok',
                body: { reason: 'updated', notes: 'owner notes' },
            }),
            res,
            {
                prisma: {} as never,
                updateDeepDiveNote: async () => payload,
                deleteDeepDiveNote: async () => {
                    throw new Error('no');
                },
            },
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });

    it('returns 200 on DELETE', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleDeepDiveByTopic(
            mockReq('DELETE', { authorization: 'Bearer tok' }),
            res,
            {
                prisma: {} as never,
                updateDeepDiveNote: async () => {
                    throw new Error('no');
                },
                deleteDeepDiveNote: async () => ({ status: 'ok' }),
            },
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { status: 'ok' });
    });
});
