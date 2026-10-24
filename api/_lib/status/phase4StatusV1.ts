// api/_lib/status/phase4StatusV1.ts
// Pure phase4-status-v1: G5 session outcome → TopicStatus (+ reason).
// No database, HTTP, or scheduling side effects.

import { TopicStatus } from '../../../generated/prisma/enums.js';
import {
    SchedulingOutcome,
    type SchedulingOutcome as SchedulingOutcomeType,
} from '../scheduling/g5Aggregation.js';
import { StatusError } from './errors.js';

export const STATUS_POLICY_VERSION = 'phase4-status-v1';

const OUTCOME_VALUES = new Set<string>(Object.values(SchedulingOutcome));
const TOPIC_STATUS_VALUES = new Set<string>(Object.values(TopicStatus));

export type StatusPolicyResult = {
    status: TopicStatus;
    previousStatus?: TopicStatus;
    policyVersion: typeof STATUS_POLICY_VERSION;
    reason: string;
};

function assertSchedulingOutcome(value: unknown): SchedulingOutcomeType {
    if (typeof value !== 'string' || !OUTCOME_VALUES.has(value)) {
        throw new StatusError(
            'INVALID_OUTCOME',
            `outcome must be one of ${[...OUTCOME_VALUES].join(', ')}; received ${String(value)}`,
        );
    }
    return value as SchedulingOutcomeType;
}

function assertTopicStatus(value: unknown): TopicStatus {
    if (typeof value !== 'string' || !TOPIC_STATUS_VALUES.has(value)) {
        throw new StatusError(
            'INVALID_TOPIC_STATUS',
            `TopicStatus must be one of ${[...TOPIC_STATUS_VALUES].join(', ')}; received ${String(value)}`,
        );
    }
    return value as TopicStatus;
}

/**
 * Map a completed-session G5 outcome to Topic.status (phase4-status-v1).
 * Deterministic: same valid outcome → same status + policyVersion.
 * `previousStatus` is optional and used only in the reason string (no hysteresis).
 */
export function mapG5OutcomeToTopicStatus(
    outcome: unknown,
    previousStatus?: unknown,
): StatusPolicyResult {
    const normalizedOutcome = assertSchedulingOutcome(outcome);
    const previous =
        previousStatus === undefined ? undefined : assertTopicStatus(previousStatus);

    let status: TopicStatus;
    let meaning: string;

    switch (normalizedOutcome) {
        case SchedulingOutcome.ADVANCE:
            status = TopicStatus.GREEN;
            meaning = 'strong enough this session';
            break;
        case SchedulingOutcome.REINFORCE:
            status = TopicStatus.YELLOW;
            meaning = 'basic understanding with DIFFICULT struggle';
            break;
        case SchedulingOutcome.REINFORCE_AT_1:
            status = TopicStatus.RED;
            meaning = 'insufficient understanding (DIDNT_UNDERSTAND)';
            break;
        case SchedulingOutcome.RESET:
            status = TopicStatus.RED;
            meaning = 'unsuccessful session (incorrect answer(s))';
            break;
        default: {
            const _exhaustive: never = normalizedOutcome;
            throw new StatusError(
                'INVALID_OUTCOME',
                `Unsupported outcome ${String(_exhaustive)}`,
            );
        }
    }

    const previousClause =
        previous === undefined ? '' : ` (was ${previous})`;
    const reason = `Status ${status}${previousClause} because session outcome ${normalizedOutcome} — ${meaning}`;

    const result: StatusPolicyResult = {
        status,
        policyVersion: STATUS_POLICY_VERSION,
        reason,
    };
    if (previous !== undefined) {
        result.previousStatus = previous;
    }
    return result;
}

/**
 * Topics with zero COMPLETED revision sessions must keep their stored status
 * (schema default RED). Do not invent provisional Green/Yellow from other signals.
 * Callers use this when no completing session outcome is available.
 */
export function retainStatusWithoutCompletedSession(
    currentStatus: unknown,
): TopicStatus {
    return assertTopicStatus(currentStatus);
}
