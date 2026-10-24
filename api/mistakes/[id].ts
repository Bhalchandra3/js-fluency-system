// api/mistakes/[id].ts
// GET /api/mistakes/:id — detail; PATCH /api/mistakes/:id — update / resolve.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { requireBearerToken } from '../_lib/auth.js';
import { prisma as defaultPrisma } from '../_lib/prisma.js';
import { MistakeApiError } from '../_lib/mistakes/errors.js';
import {
    getMistakeById as defaultGetMistakeById,
    updateMistake as defaultUpdateMistake,
    type MistakeDetailResponse,
} from '../_lib/mistakes/mistakeService.js';

export type MistakeByIdHandlerDeps = {
    prisma: PrismaClient;
    getMistakeById: (
        prisma: PrismaClient,
        id: unknown,
    ) => Promise<MistakeDetailResponse>;
    updateMistake: (
        prisma: PrismaClient,
        id: unknown,
        raw: unknown,
        now?: Date,
    ) => Promise<MistakeDetailResponse>;
    now: () => Date;
};

const defaultDeps: MistakeByIdHandlerDeps = {
    prisma: defaultPrisma,
    getMistakeById: defaultGetMistakeById,
    updateMistake: defaultUpdateMistake,
    now: () => new Date(),
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

function readId(req: VercelRequest): unknown {
    return req.query?.['id'];
}

export async function handleMistakeById(
    req: VercelRequest,
    res: VercelResponse,
    deps: MistakeByIdHandlerDeps = defaultDeps,
): Promise<void> {
    if (!requireBearerToken(req, res)) {
        return;
    }

    try {
        if (req.method === 'GET') {
            const payload = await deps.getMistakeById(deps.prisma, readId(req));
            res.status(200).json(payload);
            return;
        }

        if (req.method === 'PATCH') {
            const payload = await deps.updateMistake(
                deps.prisma,
                readId(req),
                readBody(req),
                deps.now(),
            );
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
    await handleMistakeById(req, res);
}
