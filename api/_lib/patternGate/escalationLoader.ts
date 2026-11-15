// api/_lib/patternGate/escalationLoader.ts
// Read-only Prisma → TopicGateInput snapshots for phase7-pattern-gate-v1.

import type { PrismaClient } from '../../../generated/prisma/client.js';
import {
    QuestionFormat,
    RevisionSessionStatus,
    SessionType,
} from '../../../generated/prisma/enums.js';
import {
    SchedulingOutcome,
    type SchedulingOutcome as SchedulingOutcomeType,
} from '../scheduling/g5Aggregation.js';
import {
    buildEscalations,
    PATTERN_GATE_VERSION,
    type TopicEscalation,
    type TopicGateInput,
} from './phase7PatternGateV1.js';

type DbClient = PrismaClient;

const OUTCOME_VALUES = new Set<string>(Object.values(SchedulingOutcome));

function asSchedulingOutcome(
    value: string | null | undefined,
): SchedulingOutcomeType | null {
    if (value == null || !OUTCOME_VALUES.has(value)) {
        return null;
    }
    return value as SchedulingOutcomeType;
}

/**
 * Load per-topic gate inputs from persisted rows (no writes).
 */
export async function loadTopicGateInputs(prisma: DbClient): Promise<TopicGateInput[]> {
    const [topics, unresolvedGroups, mcqGroups, completedSessions, incorrectGroups] =
        await Promise.all([
            prisma.topic.findMany({
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                },
            }),
            prisma.mistake.groupBy({
                by: ['topicId'],
                where: { resolvedAt: null },
                _count: { _all: true },
            }),
            prisma.question.groupBy({
                by: ['topicId'],
                where: {
                    sessionType: SessionType.REVISION,
                    format: QuestionFormat.MULTIPLE_CHOICE,
                },
                _count: { _all: true },
            }),
            prisma.revisionSession.findMany({
                where: { status: RevisionSessionStatus.COMPLETED },
                orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
                select: {
                    topicId: true,
                    outcome: true,
                },
            }),
            prisma.sessionLog.groupBy({
                by: ['topicId', 'questionId'],
                where: { correct: false },
                _count: { _all: true },
            }),
        ]);

    const unresolvedByTopic = new Map<string, number>();
    for (const row of unresolvedGroups) {
        unresolvedByTopic.set(row.topicId, row._count._all);
    }

    const mcqByTopic = new Map<string, number>();
    for (const row of mcqGroups) {
        mcqByTopic.set(row.topicId, row._count._all);
    }

    const recentOutcomesByTopic = new Map<
        string,
        Array<SchedulingOutcomeType | null>
    >();
    for (const session of completedSessions) {
        const list = recentOutcomesByTopic.get(session.topicId) ?? [];
        if (list.length >= 2) {
            continue;
        }
        // Preserve recency slots even when outcome is null/unknown (gate will not treat as red).
        list.push(asSchedulingOutcome(session.outcome));
        recentOutcomesByTopic.set(session.topicId, list);
    }

    const maxIncorrectByTopic = new Map<string, number>();
    for (const row of incorrectGroups) {
        const prev = maxIncorrectByTopic.get(row.topicId) ?? 0;
        if (row._count._all > prev) {
            maxIncorrectByTopic.set(row.topicId, row._count._all);
        }
    }

    return topics.map((topic) => ({
        topicId: topic.id,
        topicName: topic.name,
        topicSlug: topic.slug,
        status: topic.status,
        unresolvedMistakeCount: unresolvedByTopic.get(topic.id) ?? 0,
        revisionMcqCount: mcqByTopic.get(topic.id) ?? 0,
        recentCompletedOutcomes: recentOutcomesByTopic.get(topic.id) ?? [],
        maxIncorrectCountOnAnyQuestion: maxIncorrectByTopic.get(topic.id) ?? 0,
    }));
}

export type EscalationSummary = {
    patternGateVersion: typeof PATTERN_GATE_VERSION;
    escalations: TopicEscalation[];
};

export async function getEscalationSummary(prisma: DbClient): Promise<EscalationSummary> {
    const inputs = await loadTopicGateInputs(prisma);
    return {
        patternGateVersion: PATTERN_GATE_VERSION,
        escalations: buildEscalations(inputs),
    };
}
