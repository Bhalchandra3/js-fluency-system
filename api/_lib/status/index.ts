// api/_lib/status/index.ts
// Pure Phase 4 status helpers (phase4-status-v1). No database or HTTP I/O.

export { StatusError } from './errors.js';

export {
    STATUS_POLICY_VERSION,
    mapG5OutcomeToTopicStatus,
    retainStatusWithoutCompletedSession,
    type StatusPolicyResult,
} from './phase4StatusV1.js';
