// api/deep-dive/index.ts
// GET /api/deep-dive — list Deep Dive queue (RED first, then updatedAt desc).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { DeepDiveApiError } from '../_lib/deep-dive/errors.js';
import {
    listDeepDiveNotes as defaultListDeepDiveNotes,
    type ListDeepDiveResponse,
} from '../_lib/deep-dive/deepDiveService.js';

export type DeepDiveListHandlerDeps = {
    prisma: PrismaClient;
    listDeepDiveNotes: (prisma: PrismaClient) => Promise<ListDeepDiveResponse>;
};

const defaultDeps: DeepDiveListHandlerDeps = {
    prisma: defaultPrisma,
    listDeepDiveNotes: defaultListDeepDiveNotes,
};

export async function handleDeepDiveList(
    req: VercelRequest,
    res: VercelResponse,
    deps: DeepDiveListHandlerDeps = defaultDeps,
): Promise<void> {
    if (!requireBearerToken(req, res)) {
        return;
    }

    try {
        if (req.method !== 'GET') {
            res.status(405).json({
                status: 'error',
                message: 'Method not allowed',
            });
            return;
        }

        const payload = await deps.listDeepDiveNotes(deps.prisma);
        res.status(200).json(payload);
    } catch (error) {
        if (error instanceof DeepDiveApiError) {
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
    await handleDeepDiveList(req, res);
}
