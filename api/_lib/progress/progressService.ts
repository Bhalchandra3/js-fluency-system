// api/_lib/progress/progressService.ts
// Read-only GET /api/progress aggregation (Phase 4 Step 7 — §2.5.5).
// Does not write DailyProgress, Topic, Mistake, Deep Dive, or schedule fields.

import type { PrismaClient } from '../../../generated/prisma/client.js';
import { TopicStatus } from '../../../generated/prisma/enums.js';
import {
    isRevisionDue,
    isRevisionOverdue,
} from '../scheduling/calendarDay.js';

type DbClient = PrismaClient;

export type ProgressSummaryResponse = {
    status: 'ok';
    statusCounts: {
        green: number;
        yellow: number;
        red: number;
    };
    deepDiveCount: number;
    unresolvedMistakeCount: number;
    dueCount: number;
    overdueCount: number;
};

/**
 * Derive dashboard summary metrics from persisted Topic / Mistake / DeepDiveNote.
 *
 * Metric definitions (§2.5.5 + Phase 3 today semantics):
 * - statusCounts: count of Topic rows by Topic.status
 * - deepDiveCount: count of DeepDiveNote rows
 * - unresolvedMistakeCount: Mistake rows with resolvedAt === null
 * - dueCount: topics with nextRevisionDate due today or earlier (Kolkata; includes overdue)
 * - overdueCount: subset of due topics with nextRevisionDate before today (Kolkata)
 */
export async function getProgressSummary(
    prisma: DbClient,
    now: Date = new Date(),
): Promise<ProgressSummaryResponse> {
    const [topics, deepDiveCount, unresolvedMistakeCount] = await Promise.all([
        prisma.topic.findMany({
            select: {
                status: true,
                nextRevisionDate: true,
            },
        }),
        prisma.deepDiveNote.count(),
        prisma.mistake.count({
            where: { resolvedAt: null },
        }),
    ]);

    let green = 0;
    let yellow = 0;
    let red = 0;
    let dueCount = 0;
    let overdueCount = 0;

    for (const topic of topics) {
        switch (topic.status) {
            case TopicStatus.GREEN:
                green += 1;
                break;
            case TopicStatus.YELLOW:
                yellow += 1;
                break;
            case TopicStatus.RED:
                red += 1;
                break;
            default: {
                const _exhaustive: never = topic.status;
                void _exhaustive;
                break;
            }
        }

        if (isRevisionDue(topic.nextRevisionDate, now)) {
            dueCount += 1;
            if (isRevisionOverdue(topic.nextRevisionDate, now)) {
                overdueCount += 1;
            }
        }
    }

    return {
        status: 'ok',
        statusCounts: { green, yellow, red },
        deepDiveCount,
        unresolvedMistakeCount,
        dueCount,
        overdueCount,
    };
}
