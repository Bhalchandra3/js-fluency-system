# Current Step — Phase 3: Revision Scheduling

> Complete working record for the **entire active phase**.
> Overall project progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)
> Approved implementation baseline: [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)
> Lifecycle rules: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) §5

**Status:** In progress — Steps 0–2 complete; schema migration applied + verified on Neon; Step 3 unblocked  
**Phase:** 3 — Revision Scheduling  
**Active step:** Step 3 — Today’s Revision read API  
**Step 0:** Complete — Development Order formally approved as Phase 3 baseline  
**Step 1:** ✅ Complete — schema/lifecycle design approved (see §9.3)  
**Step 2:** ✅ Complete — scheduling helpers + unit tests (`api/_lib/scheduling/`)  
**Schema step:** ✅ Complete — disposable verified; Neon `20261015164300_add_revision_session` applied **2026-10-15** (see §9.12)

---

## 0. Document purpose and working sections

| Area | Contents |
|---|---|
| Scope and plan | Phase objective, outcomes, inclusions/exclusions |
| Execution plan | Ordered steps 0–11, dependencies, exit criteria |
| Progress | Step outcomes, verification evidence, stopping point |
| Decisions | Resolved gates + Step 1 unknowns resolution log |
| Close-out | Conclusions and handoff preparation (end of phase) |

**Phase-completion rule:** Transfer history/handoff to [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md); **only then** clear this file. Do not clear now.

---

## 1. Phase objective and measurable outcomes

Deliver a reliable daily revision loop for deep JavaScript fluency: identify due/overdue topics, run a clear revision session, record correctness and confidence separately, update the discrete 1 / 3 / 7 / 14 / 30 ladder, and explain what to do next (including empty-day).

### Measurable outcomes (phase exit)

1. Authenticated API identifies due/overdue topics using `Asia/Kolkata` calendar days; timestamps stored in UTC.
2. Authenticated Today’s Revision read API returns a due topic with embedded `REVISION` questions (no bank-wide questions API).
3. Authenticated answer API records per-answer correctness and confidence; explicit `POST /api/revision/complete` finalizes scheduling at most once per completed session.
4. Scheduling uses only Advance / Reinforce / Reset (and Reinforce-at-1) on the discrete ladder.
5. Angular Today’s Revision is the default authenticated entry; full answer → feedback → confidence → next loop works.
6. `/dashboard` shows due/overdue summary + CTA from real topic/session data (no `DailyProgress` write-path required).
7. Unit/integration/E2E coverage plus local and production smoke pass.
8. `/api/health` and `GET /api/topics` remain functional.

---

## 2. Approved scope and exclusions

### 2.1 In scope (G1)

- Revision scheduling (1 / 3 / 7 / 14 / 30)
- Due-today and overdue identification
- Revision session lifecycle
- Answer + confidence tracking (separate fields)
- Today’s Revision API + Angular screen
- Initial dashboard integration
- Local verification, production smoke, documentation closeout

### 2.2 Out of scope

- Status algorithm; Mistake Log; Deep Dive Queue (Phase 4)
- Full PRACTICE system; configurable intervals / multi-TZ UI; theme polish; multi-area roadmaps; in-app AI
- Bank-wide `GET /api/questions`; new `shared-types/`; required `DailyProgress` write-path
- Large UI redesign / adaptive learning engine

---

## 3. Architecture and scheduling principles

| Topic | Rule |
|---|---|
| Stack | Angular + Vercel `api/` + Prisma v7 + Neon + bearer token |
| Reuse | Phase 2 topics/questions APIs, auth, prisma helpers |
| G2 storage | Timestamps in **UTC** |
| G2 calendar | User day = **`Asia/Kolkata`**; intervals = calendar days (not N×24h UTC) |
| G4 ladder | Discrete only: `1 → 3 → 7 → 14 → 30` |
| Advance | One level forward; cap 30 |
| Reinforce | One level back; min 1 |
| Reset | Set to 1 |
| Reinforce at 1 day | Set to 1 (Correct + `DIDNT_UNDERSTAND` only; not generic one-step-back) |

### G5 mapping (exact — do not alter)

| Answer outcome | Confidence | Scheduling contribution |
|---|---|---|
| Correct | Easy (`EASY`) | Advance |
| Correct | Okay (`OKAY`) | Advance |
| Correct | Difficult (`DIFFICULT`) | Reinforce (one level back, min 1) |
| Correct | Didn’t understand (`DIDNT_UNDERSTAND`) | **Reinforce at 1-day interval** (set to 1) |
| Incorrect | Any | **Reset** to 1 day |

**Session aggregation precedence (finalize once per topic session):**

1. If **any** answer is incorrect → **Reset** to 1 day.  
2. Else if **any** answer has confidence `DIDNT_UNDERSTAND` → **Reinforce at 1 day**.  
3. Else if **any** answer has confidence `DIFFICULT` → **Reinforce** (one ladder step back, min 1).  
4. Else → **Advance** (one ladder step forward, cap 30).

Examples at interval 7: Difficult+Okay → 3; Okay+Easy → 14; Didn’t understand+Easy → 1; any Incorrect → 1.

**Finalization (Decision A — approved):** Topic schedule updates **only** on explicit `POST /api/revision/complete`. Answer submission never advances the ladder. Incomplete session → no schedule change. Completed session → finalize at most once. Server-authoritative. Persist answer history, confidence, correctness, session outcome, previous/resulting interval & due date, policy version. Stable expected question set required (Decision B — see §9.3).

### Other agreed gates

| Gate | Decision |
|---|---|
| G3 | Embed `REVISION` questions; no bank-wide questions API; Step 5 N/A |
| G6 | Do not require `DailyProgress` write-path; derive dashboard summaries |
| G7 | Default route → Today’s Revision; `/dashboard` summary + CTA; empty-day UX |
| G8 | No `shared-types/`; FE-local types; BE validates contracts; mismatch tests |

---

## 4. Learner-experience requirements (LX)

| ID | Criterion |
|---|---|
| LX1 | Due vs overdue clearly distinguishable |
| LX2 | Readable prompt/choices/progress (1/N) |
| LX3 | Confidence ≠ correctness; Easy cannot fix Incorrect |
| LX4 | Post-evaluation feedback; use existing `explanation` when present (do not invent) |
| LX5 | Outcome states next interval + short G4/G5 reason |
| LX6 | Helpful empty-day state (not a dead end) |
| LX7 | Progress survives refresh/navigation per persistence design; actionable errors |
| LX8 | Loading / empty / validation / failure states |
| LX9 | Use explanation/code when seed provides them; bank upgrades are future work |

---

## 5. Enterprise-grade engineering standards

Backend-authoritative scheduling/validation; consistent API errors; atomic related writes; duplicate-finalization protection; unit/integration/E2E tests; deterministic date tests (IST midnight/boundaries); safe Prisma migrations if needed; production smoke; structured logging without secrets; document contracts/limitations here and in tracker on closeout.

---

## 6. Complete ordered step sequence

### Step 0 — Approve Development Order — ✅ Complete

- Baseline: [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)
- G1–G8 approved for implementation; phase formally started in tracker.

### Step 1 — Architecture and scheduling rules (schema readiness) — ✅ Complete

| | |
|---|---|
| **Goal** | Lock persistence, evaluation, and API-contract prerequisites before coding helpers/APIs |
| **Depends on** | Step 0 |
| **Work** | ✅ Investigation + approved schema/lifecycle in §9.2–§9.5 |
| **Verification** | Decision tables filled; §9.3 approved with Decisions A/B |
| **Completion** | ✅ Schema proposal approved in principle; Prisma/migration **not** applied (deferred to later steps) |

#### Four explicit unknowns — status

| # | Unknown | Status |
|---|---|---|
| 1 | HTTP paths / contracts | **Approved for design** — see §9.4 |
| 2 | Persistence / audit | **Approved** — §9.3 (`RevisionSession` + `RevisionSessionQuestion` + SessionLog extensions) |
| 3 | Non-MCQ scoring | **Approved for design** — see §9.5 |
| 4 | Correct-answer / explanation exposure | **Approved for design** — see §9.6 |

**Approved closeout decisions:**

| ID | Decision |
|---|---|
| **A** | Explicit session completion via `POST /api/revision/complete` only — **no** auto-finalize on last answer |
| **B** | Freeze question identity + ordering via `RevisionSessionQuestion`; block learner-facing content/answer edits while referenced by any OPEN session (no full content snapshots in Phase 3) |

### Step 2 — Scheduling helpers — ✅ Complete

| | |
|---|---|
| **Goal** | UTC storage + Asia/Kolkata due/overdue + ladder transitions |
| **Depends on** | Step 1 ✅ |
| **Implemented** | `api/_lib/scheduling/*` — see §8 / §9.11 |
| **Verification** | `npm run test:scheduling` → **30/30 pass** |
| **Completion** | ✅ Helpers pass deterministic tests |
| **Boundary** | No schema/migration/API/Angular work in this step |

### Step 3 — Today’s Revision read API — ⬜ Next

| | |
|---|---|
| **Goal** | Authenticated read; embedded REVISION questions; empty-due |
| **Depends on** | Step 2 ✅; Step 1 paths/contracts + exposure rules |
| **Verification** | Auth matrix; contract tests; empty/due/overdue; no pre-eval answer leak; health/topics regression |
| **Completion** | Local verified read API |

### Step 4 — Answer/confidence submission + explicit complete API — ⬜

| | |
|---|---|
| **Goal** | Evaluate + persist answers while OPEN; explicit complete finalizes schedule once |
| **Depends on** | Steps 2–3; Step 1 evaluation + persistence |
| **Verification** | Every G5 row; aggregation only on complete; last answer does not schedule; incomplete = no schedule change; duplicate complete blocked; Incorrect ≠ confidence override; atomicity |
| **Completion** | Local verified write path with DB evidence |

### Step 5 — Questions endpoint — N/A (G3)

Skipped unless a demonstrated need reopens it.

### Step 6 — Frontend data access and authentication — ⬜

| | |
|---|---|
| **Goal** | FE-local types + bearer integration; no `shared-types/` |
| **Depends on** | Steps 3–4 |
| **Verification** | Auth success/fail; contract mismatch tests |
| **Completion** | FE can call Phase 3 APIs safely |

### Step 7 — Today’s Revision Angular screen — ⬜

| | |
|---|---|
| **Goal** | Default authenticated entry; LX session flow |
| **Depends on** | Step 6 |
| **Verification** | E2E/local walkthrough; refresh/nav; confidence ≠ correctness |
| **Completion** | Spec §5.1 loop works locally |

### Step 8 — Initial dashboard — ⬜

| | |
|---|---|
| **Goal** | `/dashboard` summary + CTA (derived data) |
| **Depends on** | Steps 3 and 7 |
| **Verification** | Real due/overdue data; CTA navigation; empty-day helpful |
| **Completion** | Initial dashboard MVP accepted |

### Step 9 — Local end-to-end verification — ⬜

| | |
|---|---|
| **Goal** | Full local quality bar |
| **Depends on** | Steps 2–8 |
| **Verification** | Suites + manual smoke; LX + engineering checklists; health/topics regression |
| **Completion** | No open local blockers |

### Step 10 — Production smoke testing — ⬜

| | |
|---|---|
| **Goal** | Core workflow on Vercel + Neon |
| **Depends on** | Step 9 |
| **Verification** | Auth + due/session/submit/outcome; no secret logging |
| **Completion** | Production smoke passes |

### Step 11 — Documentation closeout and handoff — ⬜

| | |
|---|---|
| **Goal** | Transfer to tracker §5.3; clear this file only after verified transfer |
| **Depends on** | Steps 0–10 |
| **Completion** | Phase 3 complete in tracker; Phase 4 not started |

---

## 7. Phase exit criteria

- [ ] G1–G8 implemented as approved
- [ ] UTC + Asia/Kolkata due/overdue verified with boundary tests
- [ ] Discrete ladder + G5 mapping/aggregation verified
- [ ] Incomplete sessions do not finalize; last answer does not finalize; completed sessions finalize once via explicit complete
- [ ] Today’s Revision embeds REVISION questions; no bank-wide questions API
- [ ] `correctAnswer` not exposed before required evaluation
- [ ] Default entry = Today’s Revision; `/dashboard` works
- [ ] LX1–LX9 satisfied proportionately
- [ ] Enterprise standards evidenced
- [ ] `/api/health` and `GET /api/topics` pass in production
- [ ] Tracker handoff complete; this file cleared only after transfer

---

## 8. Progress tracking

| Step | Status | Evidence / notes |
|---|---|---|
| 0 | ✅ Complete | Development Order approved; phase started (`52d4bfa`) |
| 1 | ✅ Complete | §9.3 design approved (Decisions A/B) |
| 2 | ✅ Complete | `api/_lib/scheduling/`; `npm run test:scheduling` 30/30 |
| Schema | ✅ Complete | §9.12 — disposable + Neon migrate deploy verified 2026-10-15 |
| 3 | ⬜ Next | Neon schema up to date; Step 3 unblocked |
| 4 | ⬜ | After Step 3 |
| 5 | N/A | G3 |
| 6–11 | ⬜ | Not started |

**Exact stopping point:** Phase 3 schema migration applied and verified on Neon; local regression suite green.  
**Next action:** Begin Step 3 — `GET /api/revision/today`.

---

## 9. Decision records

### 9.1 Resolved at phase start (G1–G8)

See §3 and approved Development Order. Unchanged by Step 1 investigation.

### 9.2 Architecture findings (verified)

| Area | Finding | Evidence |
|---|---|---|
| API surface | Only `api/health.ts` (unauthenticated) and `api/topics/index.ts` (bearer) | `api/` |
| Auth | `requireBearerToken` → 401 missing/invalid; 500 if `BEARER_TOKEN` unset | `api/_lib/auth.ts` |
| Errors | `{ status: 'error', message }` + 405/401/500 | `api/topics/index.ts` |
| Transactions | **None** in codebase yet | grep `api/` |
| Prisma | `Topic.intervalDays`, `Topic.nextRevisionDate` (+ index); `SessionLog` has `correct?`, `confidence`, no session id / selected answer / audit fields | `prisma/schema.prisma` |
| SessionLog uniqueness | No unique on `(topicId, questionId)` or session grouping | init migration |
| REVISION bank | 105 questions: **55 MCQ + 50 SHORT_ANSWER**; 0 OUTPUT_PREDICTION/CODE_WRITING/DEBUGGING in REVISION | `questions.json` |
| Angular | Empty routes; no HttpClient/auth/guards/features; placeholder app | `src/app/*` |
| Tests | Default `App` Jasmine specs only | `src/app/app.spec.ts` |

**Session shape (Phase 3):** One due **topic** per open session (not multi-topic). Questions = that topic’s `sessionType = REVISION` rows.

### 9.3 Persistence / schema proposal — **APPROVED** (implemented + applied)

**Status:** ✅ Design approved (Decisions A/B). ✅ Reflected in `prisma/schema.prisma` + migration `20261015164300_add_revision_session`. ✅ **Applied** to configured Neon on **2026-10-15**. See §9.12.

#### 9.3.1 Scope decision (locked)

- **Option B:** one `RevisionSession` = one `Topic`.
- At most one `OPEN` session per topic (DB-enforced via partial unique index).
- Incomplete sessions never update `Topic` scheduling.
- Answer submission never updates `Topic` scheduling.
- Completed sessions apply the G5 ladder transition **at most once**, only via explicit completion (**Decision A**).
- Resume OPEN sessions; sticky resume preferred over switching topics mid-attempt (LX7).

#### 9.3.2 Why existing models are insufficient

| Need | `SessionLog` + `Topic` today | Gap |
|---|---|---|
| Attempt boundary | No session id | Cannot group answers |
| Finalize-once | No session status | Race / double schedule update |
| Stable question set | Query live `Question` by topic | Bank edits can change membership mid-session |
| Audit previous/resulting interval & due date | Not stored | Cannot explain LX5 after the fact |
| Policy version | None | Cannot version G5 |

#### 9.3.3 Frozen question set — **`RevisionSessionQuestion` (approved — Decision B)**

At session creation, freeze **membership + order** of required `REVISION` questions for the topic (`Question.id` + `sortOrder`). Do **not** store full prompt/options/answer content snapshots in Phase 3.

| Field | Type | Purpose |
|---|---|---|
| `id` | `String @id @default(cuid())` | Row id |
| `sessionId` | FK → `RevisionSession` | Owning session |
| `questionId` | FK → `Question` | Frozen membership |
| `sortOrder` | `Int` | Stable presentation / 1..N |

Constraints: `@@unique([sessionId, questionId])`, `@@unique([sessionId, sortOrder])`, `onDelete: Restrict` on `questionId` (block deleting a question referenced by any session association), cascade delete association rows when session deleted.

**Resume / complete:** membership always from this association — never reconstruct from a live REVISION bank query.  
**Completion check:** every `RevisionSessionQuestion` has a matching `SessionLog`.  
**Answers:** reject `questionId` ∉ session set; every associated question must belong to the session’s topic (`question.topicId === session.topicId`).

##### Question-editing safeguard (Decision B — application-enforced)

- A question referenced by **any OPEN** revision session must not be edited in a way that changes learner-facing content or the expected answer (`prompt`, `options`, `correctAnswer`, `explanation`, `codeSnippet`, `format`, or topic reassignment).
- Such edits must be **rejected or deferred** until no OPEN session references the question.
- Edits may proceed after referencing sessions are `COMPLETED`.
- Enforcement must be **server-side**; a frontend-only restriction is insufficient.
- **Verified today:** no question-edit API exists under `api/`. The only mutator found is `prisma/seed.ts` (create/update by seed match). When question-management or operational reseed paths are added, they **must** enforce the OPEN-session guard (including seed if reseed can run while sessions are OPEN). Documented requirement for future implementation — not an existing mechanism.

#### 9.3.4 Approved Prisma schema shape (applied on Neon 2026-10-15)

```prisma
enum RevisionSessionStatus {
  OPEN
  COMPLETED
}

enum RevisionSessionOutcome {
  ADVANCE
  REINFORCE
  REINFORCE_AT_1
  RESET
}

model RevisionSession {
  id                        String                 @id @default(cuid())
  topicId                   String
  topic                     Topic                  @relation(fields: [topicId], references: [id], onDelete: Cascade)

  status                    RevisionSessionStatus  @default(OPEN)
  startedAt                 DateTime               @default(now())
  completedAt               DateTime?

  outcome                   RevisionSessionOutcome?
  previousIntervalDays      Int?
  resultingIntervalDays     Int?
  previousNextRevisionDate  DateTime?
  resultingNextRevisionDate DateTime?
  policyVersion             String                 @default("phase3-g5-v1")

  questions                 RevisionSessionQuestion[]
  logs                      SessionLog[]

  @@index([topicId, status])
  @@index([startedAt])
}

model RevisionSessionQuestion {
  id         String          @id @default(cuid())
  sessionId  String
  session    RevisionSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questionId String
  question   Question        @relation(fields: [questionId], references: [id], onDelete: Restrict)
  sortOrder  Int

  @@unique([sessionId, questionId])
  @@unique([sessionId, sortOrder])
  @@index([questionId])
}

// SessionLog — additive (existing fields retained):
//   sessionId      String  (required after staged migration when safe)
//   session        RevisionSession @relation(..., onDelete: Cascade)
//   selectedAnswer String
//   @@unique([sessionId, questionId])
// Topic: revisionSessions RevisionSession[]
// Question: sessionQuestions RevisionSessionQuestion[]
```

**Partial unique index (raw SQL in migration — Prisma does not express partial unique indexes natively):**

```sql
CREATE UNIQUE INDEX "RevisionSession_one_open_per_topic_idx"
  ON "RevisionSession" ("topicId")
  WHERE "status" = 'OPEN';
```

**Prisma/PostgreSQL notes (implementation stage):**
- Models/enums/FKs/uniques above are expressible in Prisma.
- The one-OPEN-per-topic constraint **must** be added via migration SQL (`@@index` alone is insufficient).
- `FOR UPDATE` locking uses interactive `$transaction` + raw/`$queryRaw` or Prisma’s supported locking patterns — document in Step 4 implementation.

#### 9.3.5 Field essentiality

| Field | Essential? | Why |
|---|---|---|
| `RevisionSession.status/startedAt/completedAt` | Yes | Lifecycle + incomplete vs done |
| `outcome` + previous/resulting interval & due dates | Yes | G5 audit + LX5 |
| `policyVersion` | Yes | Explain which rules applied |
| `RevisionSessionQuestion.*` | Yes | Frozen membership / completion determinism (Decision B) |
| Content snapshots on association | **No** | Identity + order + edit guard suffice for Phase 3 |
| Separate audit table | **No** | Covered by session + logs |
| `SessionLog.selectedAnswer` | Yes | What was submitted |
| `SessionLog.sessionId` + unique | Yes | Upsert + membership bind |

#### 9.3.6 Answer submission semantics — **upsert while OPEN**

- `POST /api/revision/answers` is an **upsert** on `(sessionId, questionId)` while `status = OPEN` (learner may correct before explicit complete).
- Must verify `questionId` ∈ `RevisionSessionQuestion` for that session and `question.topicId === session.topicId`.
- Submitting the last unanswered question **does not** finalize the session (**Decision A**).
- After `COMPLETED`: reject further answer writes (**409**).
- `selectedAnswer` required; `correct` + `confidence` stored independently (G5).
- Topic schedule is **never** updated in the answers path.

#### 9.3.7 Lifecycle (Decision A — explicit completion)

1. **Create/reuse OPEN:** In a transaction, try create; on unique violation of one-OPEN-per-topic index, re-fetch existing OPEN and return it. On create, insert `RevisionSessionQuestion` rows for current topic `REVISION` questions (stable order: e.g. `createdAt`, then `id`).
2. **GET resume:** Return session + questions via association join (frozen set — not a fresh bank membership query).
3. **Answer upsert** while OPEN (rules above); last answer leaves session `OPEN`.
4. **Reject** out-of-set question ids; reject answers when `COMPLETED`.
5. **Explicit complete** via `POST /api/revision/complete` only.
6. **Reject complete** if any association row lacks a log — no schedule change.
7. **Valid complete:** atomic transaction (§9.3.8) — validate, aggregate G5, update Topic schedule, persist session audit, OPEN→COMPLETED.
8. **Retry complete** after success: return stored outcome; no second Topic write.
9. **Failed transaction:** session remains OPEN (or prior consistent state); schedule unchanged; safe to retry.
10. **Abandoned OPEN:** remains OPEN; resume on later GET (LX7).

#### 9.3.8 Concurrency, transactions, finalize-once

No `$transaction` usage exists in `api/` today; Prisma supports interactive transactions.

**Concurrent OPEN create:** must rely on the PostgreSQL partial unique index **plus** application conflict handling (catch unique violation → fetch existing OPEN). An application-level “check then create” alone is **not** sufficient.

**Concurrent finalize:** a status read alone is **not** sufficient. Use an atomic transaction with row locking / guarded state transition:

1. `BEGIN`
2. `SELECT … FROM RevisionSession WHERE id = $id FOR UPDATE`
3. If `COMPLETED` → return stored audit (no Topic write)
4. If `OPEN` → verify every frozen association question has a `SessionLog`
5. If answers missing → abort/reject; no schedule change
6. Snapshot `Topic.intervalDays` / `nextRevisionDate` (`FOR UPDATE` on Topic row)
7. Compute outcome via G5 aggregation / ladder (§3)
8. Update `Topic` schedule (UTC storage; due date from Asia/Kolkata calendar-day math in helpers)
9. Set session `COMPLETED`, `completedAt`, outcome + audit fields **only if still OPEN** (guarded update)
10. `COMMIT` — Topic schedule, session outcome, completion timestamp, and audit fields commit together

Failed transactions leave session and schedule consistent for safe retries.

#### 9.3.9 Migration / historical data safeguards (implementation stage)

| Fact | Evidence |
|---|---|
| No API currently inserts `SessionLog` | `api/` inspection |
| Table **may still be non-empty** in some envs (manual/studio) | Cannot claim empty without DB check |

**Required read-only pre-migration checks (before any migration apply):**

```sql
SELECT COUNT(*) FROM "SessionLog";
SELECT COUNT(*) FROM "RevisionSession"; -- expect 0 pre-migrate
```

**Staged migration plan (when schema work is authorized):**

1. Add enums + `RevisionSession` + `RevisionSessionQuestion` + partial unique index (raw SQL).  
2. Add nullable `SessionLog.sessionId`, nullable `selectedAnswer`.  
3. If `SessionLog` count > 0: either (a) leave orphans with `sessionId NULL` and **defer** making `sessionId` required until purged/archived, or (b) delete/archive unsessioned logs after backup if confirmed disposable.  
4. For greenfield/empty: set `sessionId` + `selectedAnswer` **NOT NULL** + FK + `@@unique([sessionId, questionId])`.  
5. Verify partial unique index with concurrent create test in staging.  
6. Rollback: reverse migration drops new tables/columns/index; do not drop `Topic`/`Question` data.

**Preflight (schema implementation session):** `SessionLog` count **0**; revision-session tables absent; provider PostgreSQL on Neon. Re-check before any deploy if environment may have changed.

#### 9.3.10 Compatibility

Aligned with G1–G8, LX1–LX9, and engineering criteria. No `DailyProgress` write-path; no bank-wide questions API; no shared-types; per-topic sessions match G3/G4/G5; Decisions A/B locked.

### 9.12 Schema implementation record

| Item | Result |
|---|---|
| `prisma/schema.prisma` | Added `RevisionSessionStatus`, `RevisionSessionOutcome`, `RevisionSession`, `RevisionSessionQuestion`; SessionLog `sessionId` + `selectedAnswer` + unique; Topic/Question relations |
| Migration | `prisma/migrations/20261015164300_add_revision_session/migration.sql` — enums, tables, FKs, uniques, **partial unique** `RevisionSession_one_open_per_topic_idx` |
| SessionLog nullability | **NOT NULL** for new columns (preflight count 0). Do not apply to non-empty SessionLog without staged path |
| Seed safeguard | `prisma/openSessionQuestionGuard.ts` — throws before content update if question is in an OPEN session; wired in `prisma/seed.ts` |
| `prisma validate` | ✅ passed |
| `prisma generate` | ✅ Client regenerated to `generated/prisma` (includes new enums/models) |
| `npm run test:scheduling` | ✅ 30/30 |
| `npm run test:prisma-guards` | ✅ 1/1 (error-message contract) |
| Migration applied to Neon | ✅ **Applied 2026-10-15** — `npx prisma migrate deploy`; status up to date; migration `20261015164300_add_revision_session` |
| Neon target (safe IDs) | Project `gentle-credit-44872759` (`JavaScript_Fluency_System`); branch `production` / `br-damp-breeze-b5y6yfi7`; endpoint `ep-plain-art-b5b20rvd`; DB `neondb`; Postgres 18.6; plan **free**; history retention **21600s (6h)** |
| Pre-migration recovery | Snapshot `snap-broad-bonus-b5ty0sa1` (`pre-phase3-revision-session-20261015-170724`, created `2026-10-15T17:07:27Z`); backup branch `br-lucky-band-b5bvee3d` (`backup-pre-phase3-20261015-170724`, parent LSN `0/397EAC8`) |
| Post-deploy schema verify | ✅ `RevisionSession` + `RevisionSessionQuestion` exist; `SessionLog.sessionId`/`selectedAnswer` NOT NULL; partial OPEN unique index; FKs (question assoc RESTRICT); Phase 2 columns intact; `SessionLog` count still 0 |
| Disposable Docker Postgres | ✅ `js-fluency-pg-test` — Postgres **18.6**, `127.0.0.1:5433`, DB `jsfluency_test` (restarted for post-deploy regression; left running) |
| `prisma migrate deploy` on disposable | ✅ All 4 migrations applied; status up to date |
| `npm run test:revision-db` | ✅ **6/6** post-deploy (disposable only; refuses Neon/non-localhost) |
| `npm run test:scheduling` / `test:prisma-guards` | ✅ **30/30** / ✅ **1/1** post-deploy |
| Concurrent OPEN / Restrict / seed guard / SessionLog | ✅ Covered by `test:revision-db` on disposable DB |
| API complete/idempotency | ⏳ Pending Step 4 (schema fields only verified) |

**Disposable env notes:** container left running for reuse (`docker rm -f js-fluency-pg-test` to remove). Test URL via process env override only — `.env` not modified.  
**Neon deploy result:** Production schema migration complete; Step 3 unblocked. API-level completion atomicity/idempotency not claimed.

### 9.4 API routes and contracts — **Approved for design** (Decision A)

Follow Vercel file routes + topics error style. All revision routes: `requireBearerToken`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/revision/today` | Due/overdue summary + open or new session for primary due topic + embedded REVISION questions from frozen set (no answers) |
| `POST` | `/api/revision/answers` | Submit one answer + confidence; evaluate; upsert `SessionLog`; **never** updates Topic schedule; session stays OPEN even after last answer |
| `POST` | `/api/revision/complete` | **Only** path that finalizes: verify all frozen questions answered; atomic G5 + schedule + COMPLETED; idempotent if already completed |

**`GET /api/revision/today` (200):**

```json
{
  "status": "ok",
  "dueCount": 0,
  "overdueCount": 0,
  "session": null
}
```

Or with work:

```json
{
  "status": "ok",
  "dueCount": 3,
  "overdueCount": 1,
  "session": {
    "id": "…",
    "status": "OPEN",
    "topic": {
      "id": "…", "name": "…", "slug": "…",
      "intervalDays": 1,
      "nextRevisionDate": "…",
      "isOverdue": true
    },
    "questions": [
      {
        "id": "…", "format": "MULTIPLE_CHOICE", "prompt": "…",
        "options": ["…"], "codeSnippet": null
      }
    ],
    "progress": { "answered": 0, "total": 2 },
    "canComplete": false
  }
}
```

Rules: create or reuse a single `OPEN` session for the selected topic (oldest overdue/due, then name/id). Questions come from `RevisionSessionQuestion` join (Decision B). Empty day → `session: null`. **Never** include `correctAnswer` or `explanation` on this payload. UX: show an explicit “Complete session” action when `canComplete` / all answered — not implied by submitting the last answer.

**`POST /api/revision/answers` body:**

```json
{
  "sessionId": "…",
  "questionId": "…",
  "selectedAnswer": "2",
  "confidence": "OKAY",
  "selfAssessedCorrect": null
}
```

- MCQ: `selectedAnswer` = option index string; server sets `correct`; `selfAssessedCorrect` ignored/forbidden.
- SHORT_ANSWER (and other self-assess formats): `selectedAnswer` = learner text; **`selfAssessedCorrect` required boolean**; server stores `correct = selfAssessedCorrect` (not string-equality scoring).

**Response (200):** `{ status, correct, explanation?, correctAnswer?, progress, sessionStatus, canComplete }`  
- `sessionStatus` remains `OPEN` after answers (including the last unanswered question).  
- `canComplete` is `true` only when every frozen question has a log.  
- **No** `scheduling` object on the answers response (schedule changes only on complete).

**`POST /api/revision/complete` body:** `{ "sessionId": "…" }`  
**Response (200):** `{ status, sessionStatus: "COMPLETED", scheduling: { outcome, previousIntervalDays, resultingIntervalDays, resultingNextRevisionDate, policyVersion, reason } }`  
Repeated complete after success returns the same stored `scheduling` without another Topic write. Missing answers → 409/400; no schedule change.

**Errors:** 401 auth; 400 validation; 404 unknown session/question; 409 session completed (answers) / incomplete answers (complete) / question topic mismatch; 405 method; 500 server — shape `{ status: "error", message }`.

**Duplicates:** Re-POST same `(sessionId, questionId)` upserts log (last confidence/answer wins) while OPEN; after COMPLETED, answers rejected with 409.

### 9.5 Evaluation policy — **Approved for design**

| Format | In REVISION bank? | Evaluation | `correct` recording | Scheduling timing |
|---|---|---|---|---|
| `MULTIPLE_CHOICE` | Yes (55) | Server: `selectedAnswer === correctAnswer` (index strings) | Boolean | Per-answer evaluation immediate; **topic schedule only on explicit complete** |
| `SHORT_ANSWER` | Yes (50) | **Self-assess** — exact match too fragile (long reference prose) | `selfAssessedCorrect` | Same |
| `OUTPUT_PREDICTION` | No (PRACTICE only today) | Prefer normalized string compare **if** `correctAnswer` present; else self-assess | Boolean or self | Same policy when added to REVISION |
| `CODE_WRITING` | No (PRACTICE) | Self-assess only | `selfAssessedCorrect` | Same |
| `DEBUGGING` | No (PRACTICE) | Self-assess only | `selfAssessedCorrect` | Same |

Confidence always captured separately (`ConfidenceLevel`). G5 uses stored `correct` + `confidence` only — self-assess Incorrect + Easy still **Reset**. Aggregation runs only at explicit completion.

### 9.6 Exposure policy — **Approved for design**

| Field | Initial `GET …/today` | After answer submit | Already-answered reload |
|---|---|---|---|
| `correctAnswer` | **Never** | **Yes** (after evaluation recorded) | Yes |
| `explanation` | **Never** | **Yes** if present in DB (do not invent) | Yes if answered |
| `correct` | N/A | Yes (`boolean`, or as stored) | Yes |

### 9.7 Frontend integration plan (no implementation)

| Item | Plan |
|---|---|
| HTTP | Add `provideHttpClient`; `src/app/core/api/` services + FE-local DTO types (G8) |
| Auth | Minimal token setup + functional guard (none exist today) |
| Routes | `''` → Today’s Revision; `/dashboard` → summary (G7) |
| State | Session from GET; per-answer POST; explicit Complete CTA when all answered; show LX loading/empty/error/success |
| Tests | Contract fixtures shared as JSON under e.g. `src/app/core/api/fixtures/`; Jasmine unit tests; later E2E |

### 9.8 Tests required before/with implementation

- Unit: Kolkata calendar due/overdue, ladder transitions, G5 precedence, unsupported intervals.
- Unit: MCQ scoring; self-assess path ignores string equality.
- Integration: auth matrix; today empty/due; answer upsert; last answer leaves OPEN; explicit complete once; duplicate complete idempotent.
- Contract: FE types vs golden JSON fixtures.
- E2E (Step 9): full revision loop + empty day.

### 9.9 G1–G8 / LX / engineering alignment

No contradictions with approved G1–G8, LX1–LX9, or engineering standards. `RevisionSession` + `RevisionSessionQuestion` + explicit complete satisfy audit, finalize-once, and stable membership. Decisions A/B are compatible with LX7 (resume OPEN) and LX5 (outcome after complete).

### 9.10 Step 1 resolution summary

| Unknown / decision | Outcome | Rationale | Affects | Schema impact |
|---|---|---|---|---|
| HTTP paths | `GET /api/revision/today`, `POST …/answers`, `POST …/complete` | Minimal surface; explicit complete | 3–4, 6–7 | None |
| Persistence | `RevisionSession` + `RevisionSessionQuestion` + SessionLog extensions + partial unique OPEN-per-topic | Stable set, audit, concurrency | Later schema step; 3–4, 7 | **Migration required (authorized later)** |
| **Decision A** | Explicit complete only; no auto-finalize on last answer | Learner control; clear schedule boundary | 4, 7 | None (lifecycle) |
| **Decision B** | Freeze id + order; OPEN-session edit guard; no content snapshots | Resume/complete determinism without snapshot bloat | Schema + future question mgmt / seed | Association model |
| Non-MCQ scoring | MCQ auto; SHORT_ANSWER (+ code formats) self-assess | Seed SHORT_ANSWER answers are long prose | 4, 7 | Request field only |
| Exposure | No answers/explanations on GET; reveal after evaluate | Backend-eval safety + LX4 | 3–4, 7 | None |

### 9.11 Step 2 — Scheduling helpers (implemented)

**Status:** ✅ Complete. Pure helpers only; no DB/API/Angular/schema changes.

| Module | Responsibility |
|---|---|
| `api/_lib/scheduling/intervalLadder.ts` | G4 ladder `1→3→7→14→30`; `advanceInterval` / `reinforceInterval` / `resetInterval` / `assertLadderInterval` |
| `api/_lib/scheduling/g5Aggregation.ts` | G5 `aggregateG5SessionOutcome(currentInterval, answers)`; uses Prisma `ConfidenceLevel`; rejects empty/invalid inputs |
| `api/_lib/scheduling/calendarDay.ts` | G2 Asia/Kolkata calendar date, add days, due/overdue/classify, next revision UTC instant, priority compare |
| `api/_lib/scheduling/errors.ts` | `SchedulingError` with codes |
| `api/_lib/scheduling/index.ts` | Public re-exports |
| `*.test.ts` + `npm run test:scheduling` | Node built-in test runner via `tsx` (no new dependency) |

**G2:** UTC instants in / UTC midnight-of-Kolkata-date out for due dates; calendar math via Kolkata Y-M-D (not N×24h); due ≤ today; overdue < today; `Intl` + explicit `timeZone: 'Asia/Kolkata'` (host TZ independent).  
**G4:** Discrete ladder only; invalid intervals throw (no silent normalize).  
**G5:** Incorrect → RESET; else DIDNT_UNDERSTAND → REINFORCE_AT_1; else DIFFICULT → REINFORCE; else ADVANCE. Correctness and confidence independent.

**Verification:** `npm run test:scheduling` → 30 passed, 0 failed (fixed reference timestamps; no wall-clock dependency).

**Limitations / assumptions:**
- Next-revision storage uses Asia/Kolkata **local midnight** as the UTC instant for that calendar date (+05:30; Kolkata has no DST).
- Empty answer collections throw `EMPTY_ANSWERS` (safe failure; no accidental ADVANCE).
- `SchedulingOutcome` string union mirrors Prisma `RevisionSessionOutcome` enums.
- Angular `ng test` unchanged; scheduling tests are Node-side only.

---

## 10. Verification outcomes

| Check | Result |
|---|---|
| Repo HEAD `52d4bfa` / synced with `origin/master` | ✅ (local schema + docs + helpers uncommitted) |
| Step 1 design approved | ✅ |
| Step 2 helpers + unit tests | ✅ `npm run test:scheduling` 30/30 |
| Schema files + migration SQL + seed guard | ✅ See §9.12 |
| Migration applied to Neon | ✅ 2026-10-15 — see §9.12 |
| Revision APIs / Angular | ❌ Not started (Step 3 next) |

---

## 11. Unresolved issues / implementation-stage checks

| Issue | Owner | Notes |
|---|---|---|
| Step 3 Today’s Revision read API | Implementation | Neon schema ready |
| OPEN-session question-edit API guard | Future question-management | Seed guard implemented; no edit API yet |
| No Angular HttpClient/guards yet | Steps 6–7 | Planned |
| PRACTICE-only formats not in REVISION sessions | Future content | Policies defined |
| Pre-migration Neon recovery artifacts | Ops | Keep snapshot `snap-broad-bonus-b5ty0sa1` and backup branch `backup-pre-phase3-20261015-170724` until confident; Free PITR window is 6h |

---

## 12. Handoff requirements (end of phase)

When Phase 3 completes: finalize this file’s history/decisions/conclusions; transfer summary + Phase 4 handoff into [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md); verify transfer; **then** clear this file. Do not auto-start Phase 4.

**Phase 4 preview:** Status algorithm, Mistake Log, Deep Dive Queue, richer progress—using Phase 3 session history and schedule fields.
