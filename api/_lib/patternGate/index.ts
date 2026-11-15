export {
    PATTERN_GATE_VERSION,
    PATTERN_GATE_THRESHOLDS,
    PATTERN_GATE_SEVERITY_ORDER,
    PatternGateSignal,
    isRedSchedulingOutcome,
    firesUnresolvedMistakeCluster,
    firesRepeatedRed,
    firesRepeatedQuestionMiss,
    firesThinMcqCoverage,
    evaluateTopicGates,
    buildEscalations,
} from './phase7PatternGateV1.js';
export type {
    PatternGateSignal as PatternGateSignalCode,
    TopicGateInput,
    TopicEscalation,
} from './phase7PatternGateV1.js';
export {
    loadTopicGateInputs,
    getEscalationSummary,
} from './escalationLoader.js';
export type { EscalationSummary } from './escalationLoader.js';
