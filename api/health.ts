import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const topicCount = await prisma.topic.count();

        res.status(200).json({
            status: 'ok',
            dbConnected: true,
            topicCount,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            dbConnected: false,
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}