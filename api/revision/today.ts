// api/revision/today.ts
// GET /api/revision/today — authenticated Today's Revision read.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import {
    getTodayRevision as defaultGetTodayRevision,
    type TodayRevisionResponse,
} from '../_lib/revision/todayService.js';

export type TodayHandlerDeps = {
    prisma: PrismaClient;
    getTodayRevision: (
        prisma: PrismaClient,
        now?: Date,
    ) => Promise<TodayRevisionResponse>;
    now: () => Date;
};

const defaultDeps: TodayHandlerDeps = {
    prisma: defaultPrisma,
    getTodayRevision: defaultGetTodayRevision,
    now: () => new Date(),
};

export async function handleTodayRevision(
    req: VercelRequest,
    res: VercelResponse,
    deps: TodayHandlerDeps = defaultDeps,
): Promise<void> {
    if (!requireBearerToken(req, res)) {
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({
            status: 'error',
            message: 'Method not allowed',
        });
        return;
    }

    try {
        const payload = await deps.getTodayRevision(deps.prisma, deps.now());
        res.status(200).json(payload);
    } catch (error) {
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
    await handleTodayRevision(req, res);
}
