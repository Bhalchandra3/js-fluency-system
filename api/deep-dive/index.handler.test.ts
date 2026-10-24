// api/deep-dive/index.handler.test.ts

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleDeepDiveList } from './index.js';
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

function mockReq(method: string, authorization?: string): VercelRequest {
    return {
        method,
        headers: authorization ? { authorization } : {},
    } as VercelRequest;
}

describe('GET /api/deep-dive handler', () => {
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
        await handleDeepDiveList(mockReq('GET'), res, {
            prisma: {} as never,
            listDeepDiveNotes: async () => {
                throw new Error('no');
            },
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 401 for invalid bearer token', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleDeepDiveList(mockReq('GET', 'Bearer wrong'), res, {
            prisma: {} as never,
            listDeepDiveNotes: async () => {
                throw new Error('no');
            },
        });
        assert.equal(res.statusCode, 401);
    });

    it('returns 405 for non-GET', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleDeepDiveList(mockReq('POST', 'Bearer tok'), res, {
            prisma: {} as never,
            listDeepDiveNotes: async () => {
                throw new Error('no');
            },
        });
        assert.equal(res.statusCode, 405);
    });

    it('maps DeepDiveApiError to status envelope', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        await handleDeepDiveList(mockReq('GET', 'Bearer tok'), res, {
            prisma: {} as never,
            listDeepDiveNotes: async () => {
                throw new DeepDiveApiError(500, 'unexpected');
            },
        });
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, { status: 'error', message: 'unexpected' });
    });

    it('returns 200 list payload on GET', async () => {
        process.env['BEARER_TOKEN'] = 'tok';
        const res = mockRes();
        const payload = { status: 'ok' as const, notes: [] };
        await handleDeepDiveList(mockReq('GET', 'Bearer tok'), res, {
            prisma: {} as never,
            listDeepDiveNotes: async () => payload,
        });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, payload);
    });
});
