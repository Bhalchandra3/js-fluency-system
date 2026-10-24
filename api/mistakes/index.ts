// api/mistakes/index.ts
// GET /api/mistakes — list; POST /api/mistakes — manual create.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { MistakeApiError } from '../_lib/mistakes/errors.js';
import {
    createMistake as defaultCreateMistake,
    listMistakes as defaultListMistakes,
    type ListMistakesQuery,
    type ListMistakesResponse,
    type MistakeDetailResponse,
} from '../_lib/mistakes/mistakeService.js';

export type MistakesCollectionHandlerDeps = {
    prisma: PrismaClient;
    listMistakes: (
        prisma: PrismaClient,
        query: ListMistakesQuery,
    ) => Promise<ListMistakesResponse>;
    createMistake: (
        prisma: PrismaClient,
        raw: unknown,
    ) => Promise<MistakeDetailResponse>;
};

const defaultDeps: MistakesCollectionHandlerDeps = {
    prisma: defaultPrisma,
    listMistakes: defaultListMistakes,
    createMistake: defaultCreateMistake,
};

function readBody(req: VercelRequest): unknown {
    const body = req.body;
    if (body === null || body === undefined) {
        return {};
    }
    if (typeof body === 'string') {
        try {
            return JSON.parse(body) as unknown;
        } catch {
            throw new MistakeApiError(400, 'Request body must be valid JSON');
        }
    }
    if (typeof body !== 'object') {
        throw new MistakeApiError(400, 'Request body must be a JSON object');
    }
    return body;
}

export async function handleMistakesCollection(
    req: VercelRequest,
    res: VercelResponse,
    deps: MistakesCollectionHandlerDeps = defaultDeps,
): Promise<void> {
    if (!requireBearerToken(req, res)) {
        return;
    }

    try {
        if (req.method === 'GET') {
            const payload = await deps.listMistakes(deps.prisma, req.query ?? {});
            res.status(200).json(payload);
            return;
        }

        if (req.method === 'POST') {
            const payload = await deps.createMistake(deps.prisma, readBody(req));
            res.status(200).json(payload);
            return;
        }

        res.status(405).json({
            status: 'error',
            message: 'Method not allowed',
        });
    } catch (error) {
        if (error instanceof MistakeApiError) {
            res.status(error.statusCode).json({
                status: 'error',
                message: error.message,
            });
            return;
        }
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'unknown error',
        });
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
): Promise<void> {
    await handleMistakesCollection(req, res);
}
