import { prisma } from '../_lib/prisma.js';
import { requireBearerToken } from '../_lib/auth.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const topics = await prisma.topic.findMany({
            orderBy: { name: 'asc' },
        });

        res.status(200).json({
            status: 'ok',
            topics,
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'unknown error',
        });
    }
}