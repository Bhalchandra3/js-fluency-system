// api/_lib/revision/sessionProgress.ts

export type SessionProgress = {
    answered: number;
    total: number;
    canComplete: boolean;
};

/**
 * Progress over the frozen question set only.
 * `answered` counts distinct frozen questionIds that have a log.
 */
export function computeSessionProgress(
    frozenQuestionIds: readonly string[],
    answeredQuestionIds: readonly string[],
): SessionProgress {
    const frozen = new Set(frozenQuestionIds);
    const answered = answeredQuestionIds.filter((id) => frozen.has(id)).length;
    const total = frozenQuestionIds.length;

    return {
        answered,
        total,
        canComplete: total > 0 && answered === total,
    };
}
