# JavaScript Fluency System — Phase 5 Development Order

> Canonical detailed plan for **Phase 5 — Persistent Cloud Data & Cross-Device Engineering Quality**.
> Active working record: [`CURRENT_STEP.md`](./CURRENT_STEP.md)
> Overall progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)
> Phase 4 completed baseline: [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md)
>
> **Rule:** Complete and verify each step before moving to the next.

---

## 1. Phase 5 Objective

Elevate the deployed system to enterprise-grade engineering reliability, data durability, and seamless cross-device continuity across laptop and mobile without introducing recurring costs or unnecessary architectural complexity:
1. **Cross-Device Resumption:** Hydrate active revision sessions so in-progress sessions resume identically on another device or after a browser refresh without losing feedback or answer states.
2. **Database Isolation:** Decouple local development from production Neon databases via Neon branching.
3. **Serverless Connection Hardening:** Bound node-postgres connections (`max: 1` per container) and implement timing-safe authentication.
4. **Auth & UX Guardrails:** Validate access tokens before saving on `/setup` and provide a header session disconnect action.
5. **Stationary Tab Freshness:** Implement page visibility listeners and manual refresh on the dashboard.
6. **Data Durability:** Provide a zero-dependency local JSON backup script (`scripts/backup-db.ts`) and recovery documentation.

---

## 2. Execution Order

| Step | Scope | Status |
|---|---|---|
| **Step 0** | Database Isolation & Environment Configuration (`.env.example`, Neon branch verification) | ✅ Complete (2026-11-13) |
| **Step 1** | Backend Serverless Connection & Security Hardening (`api/_lib/prisma.ts`, `api/_lib/auth.ts`, `api/health.ts`) | ✅ Complete (2026-11-13) |
| **Step 2** | Revision Session Resumption API & DTO (`api/_lib/revision/todayService.ts`, DTO expansion) | ✅ Complete (2026-11-13) |
| **Step 3** | Frontend Revision Session Resumption Hydration (`revision-today.page.ts`, tests) | ✅ Complete (2026-11-13) |
| **Step 4** | Authentication UX & Shell Controls (`token-setup.page.ts`, header disconnect) | ✅ Complete (2026-11-13) |
| **Step 5** | Tab Visibility Re-validation & Freshness (`dashboard.page.ts`, visibility listener) | ✅ Complete (2026-11-13) |
| **Step 6** | Database Snapshot Tooling & Disaster Recovery Runbook (`scripts/backup-db.ts`) | ✅ Complete (2026-11-13) |
| **Step 7** | Full Cross-Device E2E Verification & Phase 5 Documentation Closeout | 🔄 In Progress |

---

## 3. Step Details & Verification

### Step 0: Database Isolation & Environment Configuration (Complete)
- 0A: `.env.local` deleted, `.env.example` updated with local `dev` vs production `main` guidance.
- 0B: `npx prisma migrate status` verified schema up-to-date on dev database.
- 0C: Local `npx vercel dev` verified on `/api/health`. Production baseline verified.

### Step 1: Backend Serverless Connection & Security Hardening
- 1.1: Configure `pg.Pool` with `max: 1` and `idleTimeoutMillis: 30000` in `api/_lib/prisma.ts`.
- 1.2: Cache Prisma and pg pool on `globalThis` across all environments.
- 1.3: Use `crypto.timingSafeEqual` in `api/_lib/auth.ts`.
- 1.4: Sanitize error output in `api/health.ts`.
- Verification: `npm run test:scheduling`, `npm run test:status`, `npm run test:revision-today`.

### Step 2: Revision Session Resumption API & DTO
- Expand `getTodayRevision` query in `api/_lib/revision/todayService.ts` to include answered question details and feedback.
- Update `TodaySessionDto` with `answers` record.
- Verification: `api/revision/today.handler.test.ts`.

### Step 3: Frontend Revision Resumption Hydration
- In `RevisionTodayPage`, hydrate `feedbackByQuestion` and `drafts` from `session.answers`.
- Select first unanswered question on load; disable re-submission of answered questions.
- Verification: `revision-today.page.spec.ts`.

### Step 4: Authentication UX & Shell Controls
- Validate token against `GET /api/topics` before saving on `/setup`. Auto-redirect to `/dashboard`.
- Add "Disconnect" button in header navigation.
- Verification: `token-setup.page.spec.ts`.

### Step 5: Tab Visibility Re-validation & Freshness
- Add `visibilitychange` listener on Dashboard and Revision pages (>60s inactivity triggers refresh).
- Add manual "Refresh" button on Dashboard.
- Verification: Component tests and manual tab switch test.

### Step 6: Database Snapshot Tooling & Disaster Recovery Runbook
- Create `scripts/backup-db.ts` and add `npm run db:backup`.
- Create `docs/operations/DISASTER_RECOVERY.md`.
- Verification: Run backup command and verify generated JSON archive.

### Step 7: Full Cross-Device E2E Verification & Phase 5 Closeout
- Execute cross-device laptop ↔ mobile test matrix.
- Update `PROJECT_TRACKER.md` and documentation.
