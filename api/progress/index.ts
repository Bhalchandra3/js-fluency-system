// api/progress/index.ts
// GET /api/progress — authenticated read-only dashboard summary (§2.5.5).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { ProgressApiError } from '../_lib/progress/errors.js';
import {
    getProgressSummary as defaultGetProgressSummary,
    type ProgressSummaryResponse,
} from '../_lib/progress/progressService.js';

export type ProgressHandlerDeps = {
    prisma: PrismaClient;
    getProgressSummary: (
        prisma: PrismaClient,
        now?: Date,
    ) => Promise<ProgressSummaryResponse>;
    now: () => Date;
};

const defaultDeps: ProgressHandlerDeps = {
    prisma: defaultPrisma,
    getProgressSummary: defaultGetProgressSummary,
    now: () => new Date(),
};

export async function handleProgress(
    req: VercelRequest,
    res: VercelResponse,
    deps: ProgressHandlerDeps = defaultDeps,
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

        const payload = await deps.getProgressSummary(deps.prisma, deps.now());
        res.status(200).json(payload);
    } catch (error) {
        if (error instanceof ProgressApiError) {
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
    await handleProgress(req, res);
}
