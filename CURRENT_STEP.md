# Current Step â€” Phase 3: Revision Scheduling

> Complete working record for the **entire active phase**.
> Overall project progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)
> Approved implementation baseline: [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)
> Lifecycle rules: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) Â§5

**Status:** In progress â€” Steps 0â€“4 complete; Step 6 next (Step 5 N/A)
**Phase:** 3 â€” Revision Scheduling
**Active step:** Step 6 â€” Frontend data access and authentication
**Step 0:** Complete â€” Development Order formally approved as Phase 3 baseline
**Step 1:** âœ… Complete â€” schema/lifecycle design approved (see Â§9.3)
**Step 2:** âœ… Complete â€” scheduling helpers + unit tests (`api/_lib/scheduling/`)
**Schema step:** âœ… Complete â€” disposable verified; Neon `20261015164300_add_revision_session` applied **2026-10-15** (see Â§9.12)
**Step 3:** âœ… Complete â€” `GET /api/revision/today` implemented + verified (see Â§9.13)
**Step 4:** âœ… Complete â€” answers + complete APIs verified (see Â§9.14)

---

## 0. Document purpose and working sections

| Area | Contents |
|---|---|
| Scope and plan | Phase objective, outcomes, inclusions/exclusions |
| Execution plan | Ordered steps 0â€“11, dependencies, exit criteria |
| Progress | Step outcomes, verification evidence, stopping point |
| Decisions | Resolved gates + Step 1 unknowns resolution log |
| Close-out | Conclusions and handoff preparation (end of phase) |

**Phase-completion rule:** Transfer history/handoff to [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md); **only then** clear this file. Do not clear now.

---

## 1. Phase objective and measurable outcomes

Deliver a reliable daily revision loop for deep JavaScript fluency: identify due/overdue topics, run a clear revision session, record correctness and confidence separately, update the discrete 1 / 3 / 7 / 14 / 30 ladder, and explain what to do next (including empty-day).

### Measurable outcomes (phase exit)

1. Authenticated API identifies due/overdue topics using `Asia/Kolkata` calendar days; timestamps stored in UTC.
2. Authenticated Todayâ€™s Revision read API returns a due topic with embedded `REVISION` questions (no bank-wide questions API).
3. Authenticated answer API records per-answer correctness and confidence; explicit `POST /api/revision/complete` finalizes scheduling at most once per completed session.
4. Scheduling uses only Advance / Reinforce / Reset (and Reinforce-at-1) on the discrete ladder.
5. Angular Todayâ€™s Revision is the default authenticated entry; full answer â†’ feedback â†’ confidence â†’ next loop works.
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
- Todayâ€™s Revision API + Angular screen
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
| G2 calendar | User day = **`Asia/Kolkata`**; intervals = calendar days (not NÃ—24h UTC) |
| G4 ladder | Discrete only: `1 â†’ 3 â†’ 7 â†’ 14 â†’ 30` |
| Advance | One level forward; cap 30 |
| Reinforce | One level back; min 1 |
| Reset | Set to 1 |
| Reinforce at 1 day | Set to 1 (Correct + `DIDNT_UNDERSTAND` only; not generic one-step-back) |

### G5 mapping (exact â€” do not alter)

| Answer outcome | Confidence | Scheduling contribution |
|---|---|---|
| Correct | Easy (`EASY`) | Advance |
| Correct | Okay (`OKAY`) | Advance |
| Correct | Difficult (`DIFFICULT`) | Reinforce (one level back, min 1) |
| Correct | Didnâ€™t understand (`DIDNT_UNDERSTAND`) | **Reinforce at 1-day interval** (set to 1) |
| Incorrect | Any | **Reset** to 1 day |

**Session aggregation precedence (finalize once per topic session):**

1. If **any** answer is incorrect â†’ **Reset** to 1 day.
2. Else if **any** answer has confidence `DIDNT_UNDERSTAND` â†’ **Reinforce at 1 day**.
3. Else if **any** answer has confidence `DIFFICULT` â†’ **Reinforce** (one ladder step back, min 1).
4. Else â†’ **Advance** (one ladder step forward, cap 30).

Examples at interval 7: Difficult+Okay â†’ 3; Okay+Easy â†’ 14; Didnâ€™t understand+Easy â†’ 1; any Incorrect â†’ 1.

**Finalization (Decision A â€” approved):** Topic schedule updates **only** on explicit `POST /api/revision/complete`. Answer submission never advances the ladder. Incomplete session â†’ no schedule change. Completed session â†’ finalize at most once. Server-authoritative. Persist answer history, confidence, correctness, session outcome, previous/resulting interval & due date, policy version. Stable expected question set required (Decision B â€” see Â§9.3).

### Other agreed gates

| Gate | Decision |
|---|---|
| G3 | Embed `REVISION` questions; no bank-wide questions API; Step 5 N/A |
| G6 | Do not require `DailyProgress` write-path; derive dashboard summaries |
| G7 | Default route â†’ Todayâ€™s Revision; `/dashboard` summary + CTA; empty-day UX |
| G8 | No `shared-types/`; FE-local types; BE validates contracts; mismatch tests |

---

## 4. Learner-experience requirements (LX)

| ID | Criterion |
|---|---|
| LX1 | Due vs overdue clearly distinguishable |
| LX2 | Readable prompt/choices/progress (1/N) |
| LX3 | Confidence â‰  correctness; Easy cannot fix Incorrect |
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

### Step 0 â€” Approve Development Order â€” âœ… Complete

- Baseline: [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)
- G1â€“G8 approved for implementation; phase formally started in tracker.

### Step 1 â€” Architecture and scheduling rules (schema readiness) â€” âœ… Complete

| | |
|---|---|
| **Goal** | Lock persistence, evaluation, and API-contract prerequisites before coding helpers/APIs |
| **Depends on** | Step 0 |
| **Work** | âœ… Investigation + approved schema/lifecycle in Â§9.2â€“Â§9.5 |
| **Verification** | Decision tables filled; Â§9.3 approved with Decisions A/B |
| **Completion** | âœ… Schema proposal approved in principle; Prisma/migration **not** applied (deferred to later steps) |

#### Four explicit unknowns â€” status

| # | Unknown | Status |
|---|---|---|
| 1 | HTTP paths / contracts | **Approved for design** â€” see Â§9.4 |
| 2 | Persistence / audit | **Approved** â€” Â§9.3 (`RevisionSession` + `RevisionSessionQuestion` + SessionLog extensions) |
| 3 | Non-MCQ scoring | **Approved for design** â€” see Â§9.5 |
| 4 | Correct-answer / explanation exposure | **Approved for design** â€” see Â§9.6 |

**Approved closeout decisions:**

| ID | Decision |
|---|---|
| **A** | Explicit session completion via `POST /api/revision/complete` only â€” **no** auto-finalize on last answer |
| **B** | Freeze question identity + ordering via `RevisionSessionQuestion`; block learner-facing content/answer edits while referenced by any OPEN session (no full content snapshots in Phase 3) |

### Step 2 â€” Scheduling helpers â€” âœ… Complete

| | |
|---|---|
| **Goal** | UTC storage + Asia/Kolkata due/overdue + ladder transitions |
| **Depends on** | Step 1 âœ… |
| **Implemented** | `api/_lib/scheduling/*` â€” see Â§8 / Â§9.11 |
| **Verification** | `npm run test:scheduling` â†’ **30/30 pass** |
| **Completion** | âœ… Helpers pass deterministic tests |
| **Boundary** | No schema/migration/API/Angular work in this step |

### Step 3 â€” Todayâ€™s Revision read API â€” âœ… Complete

| | |
|---|---|
| **Goal** | Authenticated read; embedded REVISION questions; empty-due |
| **Depends on** | Step 2 âœ…; Step 1 paths/contracts + exposure rules |
| **Delivered** | `api/revision/today.ts` + `api/_lib/revision/todayService.ts`; sticky OPEN; skip zero-REVISION topics; frozen `sortOrder` 0..n-1 |
| **Verification** | `npm run test:revision-today` 18/18; scheduling 30/30; prisma-guards 1/1; revision-db 6/6 |
| **Completion** | âœ… Local verified read API (2026-10-16) |

### Step 4 â€” Answer/confidence submission + explicit complete API â€” âœ… Complete

| | |
|---|---|
| **Goal** | Evaluate + persist answers while OPEN; explicit complete finalizes schedule once |
| **Depends on** | Steps 2â€“3; Step 1 evaluation + persistence |
| **Delivered** | `api/revision/answers.ts`, `api/revision/complete.ts`, `answerService.ts`, `completeService.ts` |
| **Verification** | `test:revision-write` 16/16; today 18/18; scheduling 30/30; guards 1/1; revision-db 6/6 |
| **Completion** | âœ… Local verified write path (2026-10-16) |

### Step 5 â€” Questions endpoint â€” N/A (G3)

Skipped unless a demonstrated need reopens it.

### Step 6 â€” Frontend data access and authentication â€” â¬œ

| | |
|---|---|
| **Goal** | FE-local types + bearer integration; no `shared-types/` |
| **Depends on** | Steps 3â€“4 |
| **Verification** | Auth success/fail; contract mismatch tests |
| **Completion** | FE can call Phase 3 APIs safely |

### Step 7 â€” Todayâ€™s Revision Angular screen â€” â¬œ

| | |
|---|---|
| **Goal** | Default authenticated entry; LX session flow |
| **Depends on** | Step 6 |
| **Verification** | E2E/local walkthrough; refresh/nav; confidence â‰  correctness |
| **Completion** | Spec Â§5.1 loop works locally |

### Step 8 â€” Initial dashboard â€” â¬œ

| | |
|---|---|
| **Goal** | `/dashboard` summary + CTA (derived data) |
| **Depends on** | Steps 3 and 7 |
| **Verification** | Real due/overdue data; CTA navigation; empty-day helpful |
| **Completion** | Initial dashboard MVP accepted |

### Step 9 â€” Local end-to-end verification â€” â¬œ

| | |
|---|---|
| **Goal** | Full local quality bar |
| **Depends on** | Steps 2â€“8 |
| **Verification** | Suites + manual smoke; LX + engineering checklists; health/topics regression |
| **Completion** | No open local blockers |

### Step 10 â€” Production smoke testing â€” â¬œ

| | |
|---|---|
| **Goal** | Core workflow on Vercel + Neon |
| **Depends on** | Step 9 |
| **Verification** | Auth + due/session/submit/outcome; no secret logging |
| **Completion** | Production smoke passes |

### Step 11 â€” Documentation closeout and handoff â€” â¬œ

| | |
|---|---|
| **Goal** | Transfer to tracker Â§5.3; clear this file only after verified transfer |
| **Depends on** | Steps 0â€“10 |
| **Completion** | Phase 3 complete in tracker; Phase 4 not started |

---

## 7. Phase exit criteria

- [ ] G1â€“G8 implemented as approved
- [ ] UTC + Asia/Kolkata due/overdue verified with boundary tests
- [ ] Discrete ladder + G5 mapping/aggregation verified
- [ ] Incomplete sessions do not finalize; last answer does not finalize; completed sessions finalize once via explicit complete
- [ ] Todayâ€™s Revision embeds REVISION questions; no bank-wide questions API
- [ ] `correctAnswer` not exposed before required evaluation
- [ ] Default entry = Todayâ€™s Revision; `/dashboard` works
- [ ] LX1â€“LX9 satisfied proportionately
- [ ] Enterprise standards evidenced
- [ ] `/api/health` and `GET /api/topics` pass in production
- [ ] Tracker handoff complete; this file cleared only after transfer

---

## 8. Progress tracking

| Step | Status | Evidence / notes |
|---|---|---|
| 0 | âœ… Complete | Development Order approved; phase started (`52d4bfa`) |
| 1 | âœ… Complete | Â§9.3 design approved (Decisions A/B) |
| 2 | âœ… Complete | `api/_lib/scheduling/`; `npm run test:scheduling` 30/30 |
| Schema | âœ… Complete | Â§9.12 â€” disposable + Neon migrate deploy verified 2026-10-15 |
| 3 | âœ… Complete | Â§9.13 â€” `GET /api/revision/today`; `test:revision-today` 18/18 |
| 4 | âœ… Complete | Â§9.14 â€” answers + complete; `test:revision-write` 16/16 |
| 5 | N/A | G3 |
| 6 | â¬œ Next | FE data access + auth |
| 7â€“11 | â¬œ | Not started |

**Exact stopping point:** Revision write APIs verified locally; Angular integration not started.
**Next action:** Begin Step 6 â€” frontend data access and authentication.

---

## 9. Decision records

### 9.1 Resolved at phase start (G1â€“G8)

See Â§3 and approved Development Order. Unchanged by Step 1 investigation.

### 9.2 Architecture findings (verified)

| Area | Finding | Evidence |
|---|---|---|
| API surface | Only `api/health.ts` (unauthenticated) and `api/topics/index.ts` (bearer) | `api/` |
| Auth | `requireBearerToken` â†’ 401 missing/invalid; 500 if `BEARER_TOKEN` unset | `api/_lib/auth.ts` |
| Errors | `{ status: 'error', message }` + 405/401/500 | `api/topics/index.ts` |
| Transactions | **None** in codebase yet | grep `api/` |
| Prisma | `Topic.intervalDays`, `Topic.nextRevisionDate` (+ index); `SessionLog` has `correct?`, `confidence`, no session id / selected answer / audit fields | `prisma/schema.prisma` |
| SessionLog uniqueness | No unique on `(topicId, questionId)` or session grouping | init migration |
| REVISION bank | 105 questions: **55 MCQ + 50 SHORT_ANSWER**; 0 OUTPUT_PREDICTION/CODE_WRITING/DEBUGGING in REVISION | `questions.json` |
| Angular | Empty routes; no HttpClient/auth/guards/features; placeholder app | `src/app/*` |
| Tests | Default `App` Jasmine specs only | `src/app/app.spec.ts` |

**Session shape (Phase 3):** One due **topic** per open session (not multi-topic). Questions = that topicâ€™s `sessionType = REVISION` rows.

### 9.3 Persistence / schema proposal â€” **APPROVED** (implemented + applied)

**Status:** âœ… Design approved (Decisions A/B). âœ… Reflected in `prisma/schema.prisma` + migration `20261015164300_add_revision_session`. âœ… **Applied** to configured Neon on **2026-10-15**. See Â§9.12.

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

#### 9.3.3 Frozen question set â€” **`RevisionSessionQuestion` (approved â€” Decision B)**

At session creation, freeze **membership + order** of required `REVISION` questions for the topic (`Question.id` + `sortOrder`). Do **not** store full prompt/options/answer content snapshots in Phase 3.

| Field | Type | Purpose |
|---|---|---|
| `id` | `String @id @default(cuid())` | Row id |
| `sessionId` | FK â†’ `RevisionSession` | Owning session |
| `questionId` | FK â†’ `Question` | Frozen membership |
| `sortOrder` | `Int` | Stable presentation / 1..N |

Constraints: `@@unique([sessionId, questionId])`, `@@unique([sessionId, sortOrder])`, `onDelete: Restrict` on `questionId` (block deleting a question referenced by any session association), cascade delete association rows when session deleted.

**Resume / complete:** membership always from this association â€” never reconstruct from a live REVISION bank query.
**Completion check:** every `RevisionSessionQuestion` has a matching `SessionLog`.
**Answers:** reject `questionId` âˆ‰ session set; every associated question must belong to the sessionâ€™s topic (`question.topicId === session.topicId`).

##### Question-editing safeguard (Decision B â€” application-enforced)

- A question referenced by **any OPEN** revision session must not be edited in a way that changes learner-facing content or the expected answer (`prompt`, `options`, `correctAnswer`, `explanation`, `codeSnippet`, `format`, or topic reassignment).
- Such edits must be **rejected or deferred** until no OPEN session references the question.
- Edits may proceed after referencing sessions are `COMPLETED`.
- Enforcement must be **server-side**; a frontend-only restriction is insufficient.
- **Verified today:** no question-edit API exists under `api/`. The only mutator found is `prisma/seed.ts` (create/update by seed match). When question-management or operational reseed paths are added, they **must** enforce the OPEN-session guard (including seed if reseed can run while sessions are OPEN). Documented requirement for future implementation â€” not an existing mechanism.

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

// SessionLog â€” additive (existing fields retained):
//   sessionId      String  (required after staged migration when safe)
//   session        RevisionSession @relation(..., onDelete: Cascade)
//   selectedAnswer String
//   @@unique([sessionId, questionId])
// Topic: revisionSessions RevisionSession[]
// Question: sessionQuestions RevisionSessionQuestion[]
```

**Partial unique index (raw SQL in migration â€” Prisma does not express partial unique indexes natively):**

```sql
CREATE UNIQUE INDEX "RevisionSession_one_open_per_topic_idx"
  ON "RevisionSession" ("topicId")
  WHERE "status" = 'OPEN';
```

**Prisma/PostgreSQL notes (implementation stage):**
- Models/enums/FKs/uniques above are expressible in Prisma.
- The one-OPEN-per-topic constraint **must** be added via migration SQL (`@@index` alone is insufficient).
- `FOR UPDATE` locking uses interactive `$transaction` + raw/`$queryRaw` or Prismaâ€™s supported locking patterns â€” document in Step 4 implementation.

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

#### 9.3.6 Answer submission semantics â€” **upsert while OPEN**

- `POST /api/revision/answers` is an **upsert** on `(sessionId, questionId)` while `status = OPEN` (learner may correct before explicit complete).
- Must verify `questionId` âˆˆ `RevisionSessionQuestion` for that session and `question.topicId === session.topicId`.
- Submitting the last unanswered question **does not** finalize the session (**Decision A**).
- After `COMPLETED`: reject further answer writes (**409**).
- `selectedAnswer` required; `correct` + `confidence` stored independently (G5).
- Topic schedule is **never** updated in the answers path.

#### 9.3.7 Lifecycle (Decision A â€” explicit completion)

1. **Create/reuse OPEN:** In a transaction, try create; on unique violation of one-OPEN-per-topic index, re-fetch existing OPEN and return it. On create, insert `RevisionSessionQuestion` rows for current topic `REVISION` questions (stable order: e.g. `createdAt`, then `id`).
2. **GET resume:** Return session + questions via association join (frozen set â€” not a fresh bank membership query).
3. **Answer upsert** while OPEN (rules above); last answer leaves session `OPEN`.
4. **Reject** out-of-set question ids; reject answers when `COMPLETED`.
5. **Explicit complete** via `POST /api/revision/complete` only.
6. **Reject complete** if any association row lacks a log â€” no schedule change.
7. **Valid complete:** atomic transaction (Â§9.3.8) â€” validate, aggregate G5, update Topic schedule, persist session audit, OPENâ†’COMPLETED.
8. **Retry complete** after success: return stored outcome; no second Topic write.
9. **Failed transaction:** session remains OPEN (or prior consistent state); schedule unchanged; safe to retry.
10. **Abandoned OPEN:** remains OPEN; resume on later GET (LX7).

#### 9.3.8 Concurrency, transactions, finalize-once

No `$transaction` usage exists in `api/` today; Prisma supports interactive transactions.

**Concurrent OPEN create:** must rely on the PostgreSQL partial unique index **plus** application conflict handling (catch unique violation â†’ fetch existing OPEN). An application-level â€œcheck then createâ€ alone is **not** sufficient.

**Concurrent finalize:** a status read alone is **not** sufficient. Use an atomic transaction with row locking / guarded state transition:

1. `BEGIN`
2. `SELECT â€¦ FROM RevisionSession WHERE id = $id FOR UPDATE`
3. If `COMPLETED` â†’ return stored audit (no Topic write)
4. If `OPEN` â†’ verify every frozen association question has a `SessionLog`
5. If answers missing â†’ abort/reject; no schedule change
6. Snapshot `Topic.intervalDays` / `nextRevisionDate` (`FOR UPDATE` on Topic row)
7. Compute outcome via G5 aggregation / ladder (Â§3)
8. Update `Topic` schedule (UTC storage; due date from Asia/Kolkata calendar-day math in helpers)
9. Set session `COMPLETED`, `completedAt`, outcome + audit fields **only if still OPEN** (guarded update)
10. `COMMIT` â€” Topic schedule, session outcome, completion timestamp, and audit fields commit together

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

Aligned with G1â€“G8, LX1â€“LX9, and engineering criteria. No `DailyProgress` write-path; no bank-wide questions API; no shared-types; per-topic sessions match G3/G4/G5; Decisions A/B locked.

### 9.12 Schema implementation record

| Item | Result |
|---|---|
| `prisma/schema.prisma` | Added `RevisionSessionStatus`, `RevisionSessionOutcome`, `RevisionSession`, `RevisionSessionQuestion`; SessionLog `sessionId` + `selectedAnswer` + unique; Topic/Question relations |
| Migration | `prisma/migrations/20261015164300_add_revision_session/migration.sql` â€” enums, tables, FKs, uniques, **partial unique** `RevisionSession_one_open_per_topic_idx` |
| SessionLog nullability | **NOT NULL** for new columns (preflight count 0). Do not apply to non-empty SessionLog without staged path |
| Seed safeguard | `prisma/openSessionQuestionGuard.ts` â€” throws before content update if question is in an OPEN session; wired in `prisma/seed.ts` |
| `prisma validate` | âœ… passed |
| `prisma generate` | âœ… Client regenerated to `generated/prisma` (includes new enums/models) |
| `npm run test:scheduling` | âœ… 30/30 |
| `npm run test:prisma-guards` | âœ… 1/1 (error-message contract) |
| Migration applied to Neon | âœ… **Applied 2026-10-15** â€” `npx prisma migrate deploy`; status up to date; migration `20261015164300_add_revision_session` |
| Neon target (safe IDs) | Project `gentle-credit-44872759` (`JavaScript_Fluency_System`); branch `production` / `br-damp-breeze-b5y6yfi7`; endpoint `ep-plain-art-b5b20rvd`; DB `neondb`; Postgres 18.6; plan **free**; history retention **21600s (6h)** |
| Pre-migration recovery | Snapshot `snap-broad-bonus-b5ty0sa1` (`pre-phase3-revision-session-20261015-170724`, created `2026-10-15T17:07:27Z`); backup branch `br-lucky-band-b5bvee3d` (`backup-pre-phase3-20261015-170724`, parent LSN `0/397EAC8`) |
| Post-deploy schema verify | âœ… `RevisionSession` + `RevisionSessionQuestion` exist; `SessionLog.sessionId`/`selectedAnswer` NOT NULL; partial OPEN unique index; FKs (question assoc RESTRICT); Phase 2 columns intact; `SessionLog` count still 0 |
| Disposable Docker Postgres | âœ… `js-fluency-pg-test` â€” Postgres **18.6**, `127.0.0.1:5433`, DB `jsfluency_test` (restarted for post-deploy regression; left running) |
| `prisma migrate deploy` on disposable | âœ… All 4 migrations applied; status up to date |
| `npm run test:revision-db` | âœ… **6/6** post-deploy (disposable only; refuses Neon/non-localhost) |
| `npm run test:scheduling` / `test:prisma-guards` | âœ… **30/30** / âœ… **1/1** post-deploy |
| Concurrent OPEN / Restrict / seed guard / SessionLog | âœ… Covered by `test:revision-db` on disposable DB |
| API complete/idempotency | âœ… Step 4 â€” see Â§9.14 (`test:revision-write` 16/16) |

**Disposable env notes:** container left running for reuse (`docker rm -f js-fluency-pg-test` to remove). Test URL via process env override only â€” `.env` not modified.
**Neon deploy result:** Production schema migration complete; Step 3 unblocked. API-level completion atomicity/idempotency not claimed.

### 9.13 Step 3 â€” `GET /api/revision/today` implementation record

| Item | Result |
|---|---|
| Handler | `api/revision/today.ts` â€” bearer auth â†’ GET-only â†’ `getTodayRevision` |
| Service | `api/_lib/revision/todayService.ts` â€” due counts, sticky OPEN, freeze-on-create, P2002 reload |
| Counts | `dueCount` = overdue + due-today; `overdueCount` âŠ† due; future excluded |
| Sticky | Resume highest-priority OPEN among due topics; else create for first eligible due topic |
| Zero REVISION | Skip topic; never create empty session; may return `session: null` with nonzero counts |
| Freeze | `sortOrder` 0..n-1; response from associations only; no `correctAnswer` / `explanation` |
| Tests | `npm run test:revision-today` **18/18**; scheduling **30/30**; prisma-guards **1/1**; revision-db **6/6** |
| Neon migrate / seed | Not rerun |

**Stopping point after Step 3:** read path only. Step 4 owns answers + explicit complete.

### 9.14 Step 4 â€” answers + complete implementation record

| Item | Result |
|---|---|
| Handlers | `api/revision/answers.ts`, `api/revision/complete.ts` |
| Services | `answerService.ts` (FOR UPDATE session + upsert); `completeService.ts` (sessionâ†’topic locks, G5, idempotent COMPLETED) |
| MCQ | Index-string compare; `selfAssessedCorrect` present â†’ **400** |
| SHORT_ANSWER | `selfAssessedCorrect` required boolean; no prose equality |
| Complete incomplete / empty freeze | **409**; Topic unchanged |
| Duplicate complete | Stored audit + recomputed `reason`; no second Topic write |
| Concurrency | Session row lock on answers; session then topic locks on complete; concurrent complete â†’ one schedule update |
| Tests | `npm run test:revision-write` **16/16** (2026-10-16) |
| Neon migrate / seed | Not rerun |

### 9.4 API routes and contracts â€” **Approved for design** (Decision A)

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
    "id": "â€¦",
    "status": "OPEN",
    "topic": {
      "id": "â€¦", "name": "â€¦", "slug": "â€¦",
      "intervalDays": 1,
      "nextRevisionDate": "â€¦",
      "isOverdue": true
    },
    "questions": [
      {
        "id": "â€¦", "format": "MULTIPLE_CHOICE", "prompt": "â€¦",
        "options": ["â€¦"], "codeSnippet": null
      }
    ],
    "progress": { "answered": 0, "total": 2 },
    "canComplete": false
  }
}
```

Rules: create or reuse a single `OPEN` session for the selected topic (oldest overdue/due, then name/id). Questions come from `RevisionSessionQuestion` join (Decision B). Empty day â†’ `session: null`. **Never** include `correctAnswer` or `explanation` on this payload. UX: show an explicit â€œComplete sessionâ€ action when `canComplete` / all answered â€” not implied by submitting the last answer.

**`POST /api/revision/answers` body:**

```json
{
  "sessionId": "â€¦",
  "questionId": "â€¦",
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

**`POST /api/revision/complete` body:** `{ "sessionId": "â€¦" }`
**Response (200):** `{ status, sessionStatus: "COMPLETED", scheduling: { outcome, previousIntervalDays, resultingIntervalDays, resultingNextRevisionDate, policyVersion, reason } }`
Repeated complete after success returns the same stored `scheduling` without another Topic write. Missing answers â†’ 409/400; no schedule change.

**Errors:** 401 auth; 400 validation; 404 unknown session/question; 409 session completed (answers) / incomplete answers (complete) / question topic mismatch; 405 method; 500 server â€” shape `{ status: "error", message }`.

**Duplicates:** Re-POST same `(sessionId, questionId)` upserts log (last confidence/answer wins) while OPEN; after COMPLETED, answers rejected with 409.

### 9.5 Evaluation policy â€” **Approved for design**

| Format | In REVISION bank? | Evaluation | `correct` recording | Scheduling timing |
|---|---|---|---|---|
| `MULTIPLE_CHOICE` | Yes (55) | Server: `selectedAnswer === correctAnswer` (index strings) | Boolean | Per-answer evaluation immediate; **topic schedule only on explicit complete** |
| `SHORT_ANSWER` | Yes (50) | **Self-assess** â€” exact match too fragile (long reference prose) | `selfAssessedCorrect` | Same |
| `OUTPUT_PREDICTION` | No (PRACTICE only today) | Prefer normalized string compare **if** `correctAnswer` present; else self-assess | Boolean or self | Same policy when added to REVISION |
| `CODE_WRITING` | No (PRACTICE) | Self-assess only | `selfAssessedCorrect` | Same |
| `DEBUGGING` | No (PRACTICE) | Self-assess only | `selfAssessedCorrect` | Same |

Confidence always captured separately (`ConfidenceLevel`). G5 uses stored `correct` + `confidence` only â€” self-assess Incorrect + Easy still **Reset**. Aggregation runs only at explicit completion.

### 9.6 Exposure policy â€” **Approved for design**

| Field | Initial `GET â€¦/today` | After answer submit | Already-answered reload |
|---|---|---|---|
| `correctAnswer` | **Never** | **Yes** (after evaluation recorded) | Yes |
| `explanation` | **Never** | **Yes** if present in DB (do not invent) | Yes if answered |
| `correct` | N/A | Yes (`boolean`, or as stored) | Yes |

### 9.7 Frontend integration plan (no implementation)

| Item | Plan |
|---|---|
| HTTP | Add `provideHttpClient`; `src/app/core/api/` services + FE-local DTO types (G8) |
| Auth | Minimal token setup + functional guard (none exist today) |
| Routes | `''` â†’ Todayâ€™s Revision; `/dashboard` â†’ summary (G7) |
| State | Session from GET; per-answer POST; explicit Complete CTA when all answered; show LX loading/empty/error/success |
| Tests | Contract fixtures shared as JSON under e.g. `src/app/core/api/fixtures/`; Jasmine unit tests; later E2E |

### 9.8 Tests required before/with implementation

- Unit: Kolkata calendar due/overdue, ladder transitions, G5 precedence, unsupported intervals.
- Unit: MCQ scoring; self-assess path ignores string equality.
- Integration: auth matrix; today empty/due; answer upsert; last answer leaves OPEN; explicit complete once; duplicate complete idempotent.
- Contract: FE types vs golden JSON fixtures.
- E2E (Step 9): full revision loop + empty day.

### 9.9 G1â€“G8 / LX / engineering alignment

No contradictions with approved G1â€“G8, LX1â€“LX9, or engineering standards. `RevisionSession` + `RevisionSessionQuestion` + explicit complete satisfy audit, finalize-once, and stable membership. Decisions A/B are compatible with LX7 (resume OPEN) and LX5 (outcome after complete).

### 9.10 Step 1 resolution summary

| Unknown / decision | Outcome | Rationale | Affects | Schema impact |
|---|---|---|---|---|
| HTTP paths | `GET /api/revision/today`, `POST â€¦/answers`, `POST â€¦/complete` | Minimal surface; explicit complete | 3â€“4, 6â€“7 | None |
| Persistence | `RevisionSession` + `RevisionSessionQuestion` + SessionLog extensions + partial unique OPEN-per-topic | Stable set, audit, concurrency | Later schema step; 3â€“4, 7 | **Migration required (authorized later)** |
| **Decision A** | Explicit complete only; no auto-finalize on last answer | Learner control; clear schedule boundary | 4, 7 | None (lifecycle) |
| **Decision B** | Freeze id + order; OPEN-session edit guard; no content snapshots | Resume/complete determinism without snapshot bloat | Schema + future question mgmt / seed | Association model |
| Non-MCQ scoring | MCQ auto; SHORT_ANSWER (+ code formats) self-assess | Seed SHORT_ANSWER answers are long prose | 4, 7 | Request field only |
| Exposure | No answers/explanations on GET; reveal after evaluate | Backend-eval safety + LX4 | 3â€“4, 7 | None |

### 9.11 Step 2 â€” Scheduling helpers (implemented)

**Status:** âœ… Complete. Pure helpers only; no DB/API/Angular/schema changes.

| Module | Responsibility |
|---|---|
| `api/_lib/scheduling/intervalLadder.ts` | G4 ladder `1â†’3â†’7â†’14â†’30`; `advanceInterval` / `reinforceInterval` / `resetInterval` / `assertLadderInterval` |
| `api/_lib/scheduling/g5Aggregation.ts` | G5 `aggregateG5SessionOutcome(currentInterval, answers)`; uses Prisma `ConfidenceLevel`; rejects empty/invalid inputs |
| `api/_lib/scheduling/calendarDay.ts` | G2 Asia/Kolkata calendar date, add days, due/overdue/classify, next revision UTC instant, priority compare |
| `api/_lib/scheduling/errors.ts` | `SchedulingError` with codes |
| `api/_lib/scheduling/index.ts` | Public re-exports |
| `*.test.ts` + `npm run test:scheduling` | Node built-in test runner via `tsx` (no new dependency) |

**G2:** UTC instants in / UTC midnight-of-Kolkata-date out for due dates; calendar math via Kolkata Y-M-D (not NÃ—24h); due â‰¤ today; overdue < today; `Intl` + explicit `timeZone: 'Asia/Kolkata'` (host TZ independent).
**G4:** Discrete ladder only; invalid intervals throw (no silent normalize).
**G5:** Incorrect â†’ RESET; else DIDNT_UNDERSTAND â†’ REINFORCE_AT_1; else DIFFICULT â†’ REINFORCE; else ADVANCE. Correctness and confidence independent.

**Verification:** `npm run test:scheduling` â†’ 30 passed, 0 failed (fixed reference timestamps; no wall-clock dependency).

**Limitations / assumptions:**
- Next-revision storage uses Asia/Kolkata **local midnight** as the UTC instant for that calendar date (+05:30; Kolkata has no DST).
- Empty answer collections throw `EMPTY_ANSWERS` (safe failure; no accidental ADVANCE).
- `SchedulingOutcome` string union mirrors Prisma `RevisionSessionOutcome` enums.
- Angular `ng test` unchanged; scheduling tests are Node-side only.

---

## 10. Verification outcomes

| Check | Result |
|---|---|
| Repo HEAD `52d4bfa` / synced with `origin/master` | âœ… (local schema + docs + helpers uncommitted) |
| Step 1 design approved | âœ… |
| Step 2 helpers + unit tests | âœ… `npm run test:scheduling` 30/30 |
| Schema files + migration SQL + seed guard | âœ… See Â§9.12 |
| Migration applied to Neon | âœ… 2026-10-15 â€” see Â§9.12 |
| `GET /api/revision/today` | âœ… Step 3 â€” see Â§9.13 |
| Answers + complete APIs | âœ… Step 4 â€” see Â§9.14 |
| Angular FE integration | âŒ Not started (Step 6 next) |

---

## 11. Unresolved issues / implementation-stage checks

| Issue | Owner | Notes |
|---|---|---|
| Step 6 FE data access + auth | Implementation | Steps 3â€“4 APIs ready |
| OPEN-session question-edit API guard | Future question-management | Seed guard implemented; no edit API yet |
| No Angular HttpClient/guards yet | Steps 6â€“7 | Planned |
| PRACTICE-only formats not in REVISION sessions | Future content | Policies defined |
| Pre-migration Neon recovery artifacts | Ops | Keep snapshot `snap-broad-bonus-b5ty0sa1` and backup branch `backup-pre-phase3-20261015-170724` until confident; Free PITR window is 6h |

---

## 12. Handoff requirements (end of phase)

When Phase 3 completes: finalize this fileâ€™s history/decisions/conclusions; transfer summary + Phase 4 handoff into [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md); verify transfer; **then** clear this file. Do not auto-start Phase 4.

**Phase 4 preview:** Status algorithm, Mistake Log, Deep Dive Queue, richer progressâ€”using Phase 3 session history and schedule fields.
