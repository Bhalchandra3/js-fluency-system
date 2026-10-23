# JavaScript Fluency System — Phase 4 Development Order

> Canonical detailed plan for **Phase 4 — Progress + Mistakes**.
> Status: **Step 1 architecture lock complete (2026-10-23)** — Step 2 (status helpers) is next. Feature implementation beyond pure helpers has **not** started.
> Active working record: [`CURRENT_STEP.md`](./CURRENT_STEP.md)
> Overall progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)
> Phase 3 completed baseline: [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)
>
> **Rule:** Complete and verify each step before moving to the next unless a step explicitly allows parallel work.
> **Process:** This Development Order is the canonical detailed plan. [`CURRENT_STEP.md`](./CURRENT_STEP.md) is the active-step working tracker (same pattern as Phase 3).

---

## 1. Phase 4 objective

Productize progress signals that Phase 3 deliberately deferred: deterministic **Green / Yellow / Red** topic status, a usable **Mistake Log**, a usable **Deep Dive Queue** with owner notes, and a richer dashboard summary—while consuming Phase 3 session history and schedule fields **without** changing G5 scheduling.

### Measurable outcomes (by phase exit)

1. Authenticated session completion updates `Topic.status` via a documented, testable status policy (`phase4-status-v1`) at most once per completed session.
2. Status transitions are explainable from recorded correctness + confidence (and/or the already-computed G5 session outcome) without altering interval ladder behavior.
3. Mistake Log supports automatic capture from qualifying revision answers plus owner review (list / detail / edit / resolve); `turnedIntoQuestion` remains a **manual** capability flag—no automatic new bank questions in Phase 4.
4. Deep Dive Queue lists topics needing deeper study (driven primarily by Red status) with reason + owner notes (`DeepDiveNote`).
5. Dashboard (and/or thin progress summary API) shows status counts, Deep Dive summary, and Mistake Log entry points without requiring a new `DailyProgress` write-path (G6 preserved unless proven insufficient).
6. Phase 3 revision loop, auth, `/api/health`, and `GET /api/topics` remain functional (regression bar).
7. No bank-wide `GET /api/questions`; no new `shared-types/` package.

---

## 2. Scope, exclusions, and assumptions

### 2.1 In scope

| Capability | Source |
|---|---|
| Confidence → status algorithm v1 | Spec §§5.4, 5.6, §12.1; tracker Phase 4 |
| Mistake Log product flows | Spec §5.8; schema `Mistake` |
| Mistake → future question **scope** (manual flag; no auto-generate) | Spec §12.7 resolved for Phase 4 MVP |
| Deep Dive Queue + notes | Spec §5.7; schema `DeepDiveNote` |
| Richer progress / dashboard summary | Spec §5.5; tracker Phase 4 |
| Local + production verification + documentation closeout | Tracker §6 lifecycle |

### 2.2 Out of scope / deferred

| Item | Deferred to | Notes |
|---|---|---|
| Changing G1–G8 or Decisions A/B | Never in Phase 4 without explicit re-approval | Carry-forward from Phase 3 |
| Bank-wide `GET /api/questions` | Out (G3) | Embed / feature-scoped reads only |
| New `shared-types/` package | Out (G8) | FE-local types |
| Required `DailyProgress` write-path | Deferred unless G6 proven insufficient | Model may remain unused |
| Full PRACTICE / laptop practice system | Later | Spec §5.9 |
| Auto-generating new `Question` rows from mistakes | Later / Phase 7 AI optional | Phase 4: manual `turnedIntoQuestion` only |
| Injecting mistake-linked questions into frozen revision sessions | Later | Must not bypass Decision B / G5 |
| Configurable intervals / timezone preference UI | Later | Spec §12.2; G2 fixed Kolkata |
| Theme polish | Phase 6 | Spec §12.5 |
| Multi-area roadmaps | Future | Spec §12.6 |
| In-app AI | Phase 7 | Tracker Phase 7 |
| Streak-based / multi-session status smoothing | Later | v1 uses latest completed session only |
| Large UI redesign | Out | Prefer extending existing shell |

### 2.3 Verified Phase 3 handoff and reusable foundations

| Fact | Evidence |
|---|---|
| Phase 3 complete; scheduling finalize-once | Tracker §5; `POST /api/revision/complete` |
| G5 policy `phase3-g5-v1` | `api/_lib/scheduling/g5Aggregation.ts` |
| Ladder `1/3/7/14/30` | `api/_lib/scheduling/intervalLadder.ts` |
| Confidence enum on answers | `ConfidenceLevel` in schema; revision UI |
| Complete updates `intervalDays` + `nextRevisionDate` only (not `status`) | `api/_lib/revision/completeService.ts` |
| `Topic.status` exists (default `RED`); unused by product flows | `prisma/schema.prisma` |
| `Mistake`, `DeepDiveNote`, `DailyProgress` models exist; no product APIs | Schema + empty `api/mistakes`, `api/deep-dive`, `api/progress` dirs |
| `Mistake` fields today: `topicId`, `mistakeText`, `correctUnderstanding`, `turnedIntoQuestion`, `createdAt` | No `questionId` / `sessionId` / uniqueness for auto-dedupe yet |
| Angular routes: `/setup`, `/dashboard`, Today’s Revision `''` | `src/app/app.routes.ts` |
| Tests: `test:scheduling`, `test:revision-today`, `test:revision-write`, `test:prisma-guards`, `test:revision-db`, `ng test` | `package.json` |
| Question bank 260 / 52 topics; seed validates in `prisma/seed.ts` | Phase 2 complete — **not** Phase 4 Step 1 |

### 2.4 Existing behavior vs new Phase 4 policy (explicit)

| Concern | Existing (Phase 3) | Approved Phase 4 |
|---|---|---|
| Interval / due date | G5 on complete only | **Unchanged** |
| `Topic.status` | Default `RED`; never updated by APIs | Updated by **status policy v1** on complete only |
| Confidence | Stored on `SessionLog`; drives G5 | Still drives G5; **also** feeds status via session outcome mapping |
| Mistakes | Schema only | Auto + manual Mistake Log |
| Deep Dive | Schema only | Queue + notes; auto-ensure note when status → Red |
| Questions API | None (G3) | Still none |

### 2.5 Step 1 architecture lock (approved 2026-10-23)

Investigation of the live repository (schema, `completeService`, revision handlers, Angular shell/dashboard, test scripts, migrations). **No application code was changed in Step 1.** Decisions below are implementation-ready and must not contradict §§3–7 product rules.

#### 2.5.1 Topic status persistence

| Decision | Detail | Evidence |
|---|---|---|
| **Representation** | Reuse existing `Topic.status` (`TopicStatus`: `GREEN` / `YELLOW` / `RED`, default `RED`, indexed). | `prisma/schema.prisma` |
| **New Topic columns** | **None.** No `lastOutcome`, `statusUpdatedAt`, or similar. | Latest outcome already on `RevisionSession.outcome` after complete |
| **When written** | Only on first successful `OPEN` → `COMPLETED` inside `completeRevisionSession` (same transaction as G5 schedule write). | Decision A; `api/_lib/revision/completeService.ts` |
| **Mapping** | Pure helper: G5 outcome → status per §4.3 (`phase4-status-v1`). Does not call ladder helpers. | Separate from `phase3-g5-v1` |
| **Audit / policy version** | **No new `RevisionSession` column.** On complete response, include a `topicStatus` object (see §2.5.5). Duplicate complete remaps from stored `outcome` + current `Topic.status` (deterministic). | Existing session already stores `outcome` + G5 `policyVersion` |
| **Topic lock SELECT** | Extend the existing `FOR UPDATE` Topic select to include `status` so `previous` can be returned and written in one update with `intervalDays` / `nextRevisionDate`. | `completeService.ts` currently selects only schedule fields |

#### 2.5.2 Mistake Log schema (migrate in Step 3)

**Current model (verified):** `id`, `topicId` (CASCADE), `mistakeText`, `correctUnderstanding`, `turnedIntoQuestion`, `createdAt`; index on `topicId`. No provenance or resolve fields.

**Minimum safe additive schema (approved for Step 3):**

| Field | Type | Why |
|---|---|---|
| `questionId` | `String?` FK → `Question`, `onDelete: SetNull` | Reuse bank question; keep mistake if question removed |
| `sessionId` | `String?` FK → `RevisionSession`, `onDelete: SetNull` | Provenance; survive session cleanup |
| `sourceSessionLogId` | `String?` `@unique` FK → `SessionLog`, `onDelete: SetNull` | DB-level auto-dedupe; Postgres UNIQUE allows many NULLs for manual rows |
| `resolvedAt` | `DateTime?` | Soft resolve without hard delete |

**Indexes:** keep `topicId`; add `@@index([topicId, resolvedAt])` for unresolved filters.

**Out of schema for Phase 4:** extra note fields, soft-delete flags, hashes, or new Question rows from mistakes.

**Auto-create text templates (locked):**

| Case | `mistakeText` | `correctUnderstanding` |
|---|---|---|
| `correct === false` | `Answered incorrectly` | Prefer non-empty `Question.explanation`; else `Review the topic materials for the correct understanding.` |
| `correct === true` && `DIDNT_UNDERSTAND` | `Marked DIDNT_UNDERSTAND while answered correctly` | Same explanation rule |

Always set `questionId` + `sessionId` + `sourceSessionLogId` for automatic rows. Manual creates omit `sourceSessionLogId` (and may omit `questionId` / `sessionId`).

#### 2.5.3 Complete-path transaction order and duplicates

Reuse existing lock order: **RevisionSession `FOR UPDATE` → Topic `FOR UPDATE`**. Side effects run **only** when `updateMany` transitions `OPEN` → `COMPLETED` with `count === 1`.

| Order | Action |
|---|---|
| 1 | Lock session; if already `COMPLETED`, return stored scheduling + remapped `topicStatus` (**no** status/mistake/Deep Dive writes) |
| 2 | Validate frozen membership + all answered + boolean `correct` (unchanged) |
| 3 | Lock topic (include `status`); aggregate G5 (unchanged) |
| 4 | Map `phase4-status-v1` from G5 outcome |
| 5 | **Single** `Topic` update: `intervalDays`, `nextRevisionDate`, **`status`** |
| 6 | `RevisionSession` `updateMany` OPEN → COMPLETED with G5 audit fields (unchanged) |
| 7 | If `count !== 1`, reload winner audit and return (no Phase 4 side effects) |
| 8 | If new status is `RED`: **ensure** `DeepDiveNote` (create-if-missing only; never wipe `notes`; never overwrite existing `reason`) |
| 9 | Auto-create Mistake rows for qualifying final logs (`createMany` + `skipDuplicates` on `sourceSessionLogId`, or equivalent unique-violation ignore) |
| 10 | Return response with `scheduling` + `topicStatus` (+ `mistakesCreated` count) |

**Deep Dive ensure rule (locked):** create note only when none exists for `topicId`, with system `reason` strings:

- `RESET` → `[phase4-status-v1] Session RESET — incorrect answer(s)`
- `REINFORCE_AT_1` → `[phase4-status-v1] Session REINFORCE_AT_1 — DIDNT_UNDERSTAND`

If a note already exists, leave `reason` and `notes` unchanged. Leaving Red does **not** delete the note (owner DELETE only).

**Concurrency:** existing session row lock + conditional `updateMany` remain the sole finalize gate; unique `sourceSessionLogId` prevents duplicate auto-mistakes even under retries.

#### 2.5.4 Migration safety

| Item | Decision |
|---|---|
| Convention | Timestamped folder under `prisma/migrations/` (same as `20261015164300_add_revision_session`) |
| Strategy | **Additive only** — `ALTER TABLE "Mistake" ADD COLUMN …`; unique index on `sourceSessionLogId`; FKs with `ON DELETE SET NULL` |
| Local/dev | `npx prisma migrate dev --name <name>` against disposable/dev DB (`LOCAL_README.md`) |
| Integration tests | Continue `DATABASE_URL_TEST` localhost-only pattern (refuse `neon.tech`) used by `answerComplete.integration.test.ts` |
| Production | `prisma migrate deploy` to Neon only after disposable/dev validation; no manual prod SQL |
| Preflight | `prisma validate`; run Phase 3 revision suites on disposable DB after migrate |

#### 2.5.5 API contracts

**Shared conventions (do not invent parallels):** bearer via `api/_lib/auth.ts`; success `{ status: 'ok', … }`; errors `{ status: 'error', message }`; `405` for wrong method; typed `*ApiError` + handler mapping like revision routes.

**Extend complete response** (`POST /api/revision/complete` — path unchanged):

```text
{
  status: 'ok',
  sessionStatus: 'COMPLETED',
  scheduling: { outcome, previousIntervalDays, resultingIntervalDays,
                resultingNextRevisionDate, policyVersion, reason },  // existing
  topicStatus: {
    previous: 'GREEN'|'YELLOW'|'RED',
    current:  'GREEN'|'YELLOW'|'RED',
    policyVersion: 'phase4-status-v1',
    reason: string,
    deepDiveEnsured: boolean   // true only when a note was created this finalize
  },
  mistakesCreated: number      // rows inserted this finalize (0 on duplicate complete)
}
```

**Mistake Log** (populate empty `api/mistakes/`):

| Method / path | Purpose |
|---|---|
| `GET /api/mistakes` | List; query: `topicId?`, `unresolvedOnly?` (`true` ⇒ `resolvedAt` null), `limit` (default 50, max 200), `offset` (default 0). Response: `{ status, mistakes, total }` |
| `GET /api/mistakes/[id]` | Detail (+ topic name/slug; questionId/sessionId when set) |
| `POST /api/mistakes` | Manual create: `{ topicId, mistakeText, correctUnderstanding, questionId? }` — no `sourceSessionLogId` |
| `PATCH /api/mistakes/[id]` | Update owner fields: `mistakeText?`, `correctUnderstanding?`, `turnedIntoQuestion?`, `resolved?` (boolean → set/clear `resolvedAt`) |

**No hard-delete endpoint in Phase 4** (resolve only). No auto-question-generation endpoint.

**Deep Dive** (populate empty `api/deep-dive/`; key by `topicId` — unique on model):

| Method / path | Purpose |
|---|---|
| `GET /api/deep-dive` | List notes with topic `{ id, name, slug, status }`; order: `RED` first, then `updatedAt` desc |
| `PATCH /api/deep-dive/[topicId]` | Update `{ reason?, notes? }` |
| `DELETE /api/deep-dive/[topicId]` | Remove from queue (delete note); **does not** change `Topic.status` or schedule |

**Progress / dashboard summary** (populate empty `api/progress/`):

| Decision | **New thin read:** `GET /api/progress` via `api/progress/index.ts` |
|---|---|
| Why not only `GET /api/topics` | Topics already expose `status` for client-side counts, but mistake/Deep Dive counts and Kolkata due aggregates need server derivation; one summary call keeps the dashboard simple (G6/G7) |
| Why not extend `GET /api/revision/today` | Today remains session-focused; avoid coupling progress widgets to session freeze logic |
| Why not `DailyProgress` writes | G6 — model stays unused |
| Due-topic **name list** | **Deferred** (Phase 3 carry-forward); not required for Phase 4 exit |

`GET /api/progress` response shape:

```text
{
  status: 'ok',
  statusCounts: { green: number, yellow: number, red: number },
  deepDiveCount: number,
  unresolvedMistakeCount: number,
  dueCount: number,
  overdueCount: number
}
```

Due/overdue reuse existing calendar helpers from `api/_lib/scheduling/`. Dashboard may still call `GET /api/revision/today` for the open-session CTA (unchanged).

#### 2.5.6 Frontend contracts

| Piece | Decision |
|---|---|
| Types | FE-local only under `src/app/core/api/` (G8); mirror BE DTOs like `revision.types.ts` |
| Services | `MistakeApiService`, `DeepDiveApiService`, `ProgressApiService` (or one small `ProgressApiService` + mistake/deep-dive); reuse `authInterceptor` / `ApiClientError` |
| Routes | `/mistakes`, `/mistakes/:id` (or detail via query), `/deep-dive`; keep `''` = Today’s Revision, `/dashboard`, `/setup` |
| Shell nav | Add Mistakes + Deep Dive links beside existing Today / Dashboard / Access token (`src/app/app.html`) |
| Dashboard | Enrich `dashboard.page.*` with `GET /api/progress` counts + links; keep Today’s Revision as primary CTA (G7) |
| Complete UI | Tolerate extended complete JSON; ignore new fields until UI needs them |

#### 2.5.7 Testing (minimum)

| Layer | Requirement |
|---|---|
| Unit | New `test:status` (or equivalent) for `phase4-status-v1` mapping + scenarios §4.9 |
| Complete path | Extend `test:revision-write` / disposable integration: status write, Deep Dive ensure, auto-mistakes, **duplicate complete idempotent**, G5 schedule unchanged |
| Concurrency | Keep/extend race-safe complete cases (FOR UPDATE + `updateMany`) |
| Mistake / Deep Dive / progress APIs | Handler auth matrix (missing / invalid / valid) + service integration on `DATABASE_URL_TEST` |
| FE | `ng test` for new services + dashboard/mistake/deep-dive components |
| Regression | `test:scheduling`, `test:revision-today`, `test:prisma-guards`, `test:revision-db` must remain meaningful; do not weaken G5 assertions |

#### 2.5.8 Implementation order and step acceptance (dependencies)

| Step | Depends on | Acceptance (architecture view) |
|---|---|---|
| **2** Status helpers | Step 1 ✅ | Pure outcome→status+reason; export `STATUS_POLICY_VERSION`; unit tests green |
| **3** Schema migration | Step 1 ✅ (parallel with 2 OK) | Additive Mistake columns + unique `sourceSessionLogId`; validated on disposable DB |
| **4** Complete-path side effects | 2 + 3 | Transaction order §2.5.3; duplicate complete stable; G5 unchanged |
| **5** Mistake APIs | 3 (4 preferred for realism) | CRUD/resolve contracts §2.5.5; auth matrix |
| **6** Deep Dive APIs | 3 (4 for ensure) | List/update/delete; Red ensure visible after RESET complete |
| **7** `GET /api/progress` | 4–6 subset OK if counts derivable | Dashboard can render Phase 4 widgets from one summary + today |
| **8–11** Angular | 5–7 as applicable | Routes/services/UI per §2.5.6; G7 preserved |
| **12–14** Verify / smoke / closeout | 2–11 | Phase 3 + Phase 4 suites; production smoke |

---

## 3. Locked constraints (preserve Phase 3)

Phase 4 **must not** silently change:

| ID | Constraint |
|---|---|
| **G1** | Phase 3 delivered core revision loop; Phase 4 owns status / Mistake / Deep Dive productization |
| **G2** | UTC storage; calendar zone `Asia/Kolkata` for due/overdue |
| **G3** | No bank-wide `GET /api/questions` |
| **G4** | Discrete ladder only: 1 / 3 / 7 / 14 / 30 |
| **G5** | Incorrect → Reset; else `DIDNT_UNDERSTAND` → Reinforce-at-1; else `DIFFICULT` → Reinforce; else Advance |
| **G6** | Prefer derived dashboard data; no required `DailyProgress` write-path unless proven necessary |
| **G7** | Default authenticated entry remains Today’s Revision; `/dashboard` remains summary + CTA |
| **G8** | No new `shared-types/` package |
| **Decision A** | Schedule (and Phase 4 status / auto-mistake / auto-deep-dive side effects) finalize **only** on explicit `POST /api/revision/complete`; never on answer submit; at most once per completed session |
| **Decision B** | Frozen `RevisionSessionQuestion` membership/order; OPEN-session content edit guards remain |

**Server authority:** Client cannot set resulting interval, due date, or topic status. Status updates are backend-computed.

---

## 4. Approved confidence → status algorithm v1 (`phase4-status-v1`)

> **Approval:** Policy scope approved at Step 0 (2026-10-23). Implementation details were locked in Step 1 (complete 2026-10-23). It is **not** implemented.

### 4.1 Design principles

1. **Separate from scheduling.** G5 owns `intervalDays` / `nextRevisionDate`. Status owns `Topic.status` (Green / Yellow / Red product meaning per spec §5.4).
2. **Deterministic and explainable.** Same inputs → same status + reason string + `policyVersion`.
3. **Finalize-once.** Recalculate **only** inside successful session completion (Decision A), in the same transactional path as schedule finalization, so duplicate completes cannot drift status.
4. **Prefer reuse.** Map from the **already-computed G5 session outcome** (and optionally the same answer set) rather than inventing a second conflicting aggregation order.
5. **Insufficient history.** Topics with **zero** `COMPLETED` revision sessions keep current `Topic.status` (schema default `RED` for never-revised topics). Do not invent “provisional Green.”

### 4.2 Inputs

| Input | Role |
|---|---|
| G5 `outcome` for the completing session | Primary driver (`ADVANCE` / `REINFORCE` / `REINFORCE_AT_1` / `RESET`) |
| Answer set used for G5 | Already validated booleans + `ConfidenceLevel` |
| Previous `Topic.status` | For audit / reason text only in v1 (not for hysteresis) |
| Completed-session count for topic | Detect insufficient history |

**Historical results in v1:** Only the **latest completed session** determines the new status. Multi-session streaks / decay are deferred (§2.2).

### 4.3 Outcome → status mapping (v1)

Aligned to spec §5.4 meanings:

| G5 session outcome | New `TopicStatus` | Product meaning |
|---|---|---|
| `ADVANCE` | `GREEN` | Strong enough this session → continue schedule (schedule already advanced by G5) |
| `REINFORCE` | `YELLOW` | Basic understanding; struggled (`DIFFICULT`) → practice attention later |
| `REINFORCE_AT_1` | `RED` | Insufficient understanding (`DIDNT_UNDERSTAND`) → Deep Dive attention |
| `RESET` | `RED` | Unsuccessful (any incorrect) → Deep Dive attention |

**Confidence contribution (indirect):** Confidence already shaped G5 outcome via Phase 3 rules. Status does **not** re-rank confidence independently in v1 (avoids dual conflicting aggregations). Documented equivalence:

| Answer pattern (session) | G5 | Status |
|---|---|---|
| Any incorrect (any confidence) | `RESET` | `RED` |
| All correct; any `DIDNT_UNDERSTAND` | `REINFORCE_AT_1` | `RED` |
| All correct; any `DIFFICULT` (no DIDNT_UNDERSTAND) | `REINFORCE` | `YELLOW` |
| All correct; only `EASY` / `OKAY` | `ADVANCE` | `GREEN` |

### 4.4 Transitions

| From → To | When |
|---|---|
| Any → `GREEN` | Completing session outcome `ADVANCE` |
| Any → `YELLOW` | Completing session outcome `REINFORCE` |
| Any → `RED` | Completing session outcome `RESET` or `REINFORCE_AT_1` |
| Unchanged | Duplicate complete on already-`COMPLETED` session (return stored audit; **no** second status write) |
| Stay at default / prior | Topic never completed a revision session |

No hysteresis in v1 (e.g. “two Advances required to leave Red”). Immediate transition keeps the algorithm simple and testable.

### 4.5 When status is recalculated

| Event | Status update? |
|---|---|
| `POST /api/revision/answers` | **No** |
| `POST /api/revision/complete` (first successful finalize) | **Yes** — with schedule update |
| Duplicate / idempotent complete | **No** — return prior completion audit; topic already updated |
| Manual Mistake / Deep Dive edits | **No** (unless a future approved rule says otherwise) |
| Seed / topic create | Default `RED` only |

### 4.6 Idempotency and duplicates

1. Reuse existing complete-path locking: only one transition from `OPEN` → `COMPLETED`.
2. Status write occurs in the **same transaction** as schedule write + session completion.
3. If another request already completed the session, respond with stored scheduling audit and **do not** re-apply status mapping.
4. Retried clients must observe stable `Topic.status` after the first successful complete.

### 4.7 Interaction with G5 (non-interference)

- Status mapping **reads** G5 outcome; it must not call `advanceInterval` / `reinforceInterval` / `resetInterval` itself for scheduling.
- Status must not change `intervalDays` or `nextRevisionDate`.
- G5 policy version remains `phase3-g5-v1`. Status policy version is separate: **`phase4-status-v1`**.
- **Step 1 lock:** no new session column for status policy. Include `topicStatus.policyVersion` (`phase4-status-v1`) on the complete response DTO; Deep Dive auto-reason uses the `[phase4-status-v1]` prefix (§2.5.3).

### 4.8 Deep Dive side effect of Red (product coupling)

When a completing session sets status to `RED`:

- **Ensure** `DeepDiveNote` for that topic: if none exists, create with system `reason` per §2.5.3.
- If a note already exists, **do not** wipe owner `notes` and **do not** overwrite `reason` (create-if-missing only — Step 1 lock).
- When status leaves `RED`, **do not** auto-delete the Deep Dive note (owner may still want resources). Removal is an explicit owner action via Deep Dive APIs.

Yellow → “add practice” (spec §5.4) is **acknowledged** but full PRACTICE system remains deferred; dashboard may show Yellow count + copy only.

### 4.9 Example scenarios

| Scenario | Answers | G5 | Status | Notes |
|---|---|---|---|---|
| Normal progression | All correct, `EASY`/`OKAY` | `ADVANCE` | `GREEN` | Interval advances independently |
| Regression (hard) | All correct, one `DIFFICULT` | `REINFORCE` | `YELLOW` | Not Red |
| Insufficient understanding | All correct, one `DIDNT_UNDERSTAND` | `REINFORCE_AT_1` | `RED` | Deep Dive ensure |
| Repeated incorrect | Any incorrect | `RESET` | `RED` | Stays/sets Red each such session |
| Insufficient history | Never completed | — | remains default `RED` | No invented Green |
| Duplicate complete | Second complete call | stored | unchanged | Idempotent |

### 4.10 Competing option considered (not chosen for v1)

**Option B:** Independent answer aggregation for status that could disagree with G5 (e.g. map `DIDNT_UNDERSTAND` to Yellow). Rejected for v1 because dual aggregations increase learner confusion and test surface. Revisit only with explicit owner approval.

---

## 5. Mistake Log and mistake → question behavior

> **Approval:** Scope approved at Step 0 (2026-10-23). Implementation details were locked in Step 1 (complete 2026-10-23). **Not** implemented.

### 5.1 What qualifies as a mistake (Phase 4)

A **revision mistake candidate** is a `SessionLog` row from a completing session where:

1. `correct === false` (any confidence), **or**
2. `correct === true` **and** `confidence === DIDNT_UNDERSTAND`

Rationale: matches “mistaken understanding” (spec §5.8) and aligns Red-driving cases without treating every `DIFFICULT` correct answer as a logged misunderstanding (those are Yellow / practice attention).

### 5.2 When records are created

| Mode | Behavior |
|---|---|
| **Automatic** | On first successful `POST /api/revision/complete`, create Mistake rows for qualifying logs in that session |
| **Manual** | Owner may create a Mistake via authenticated API (topic + texts) |
| **Not on answer submit** | Per Decision A side-effect boundary |

### 5.3 Information retained

**Minimum using existing model:** `topicId`, `mistakeText`, `correctUnderstanding`, `turnedIntoQuestion` (default `false`), `createdAt`.

**Schema extensions (Step 1 locked; migrate in Step 3 — not applied yet):** see §2.5.2 (`questionId`, `sessionId`, `sourceSessionLogId` unique nullable, `resolvedAt`; SetNull FKs).

Until migration is applied, implementation must not invent silent columns.

**Text defaults for auto-create:** locked in §2.5.2 (incorrect / DIDNT_UNDERSTAND templates; prefer stored `explanation`).

### 5.4 Owner actions (initial release)

| Action | Phase 4 |
|---|---|
| List / filter mistakes (by topic, unresolved) | Yes |
| View detail | Yes |
| Edit `mistakeText` / `correctUnderstanding` / notes-equivalent fields | Yes (owner texts) |
| Resolve / unresolve | Yes (`resolvedAt`) |
| Delete | Optional soft-delete vs hard delete — prefer resolve; hard delete only if needed |
| Set `turnedIntoQuestion` | Yes **manual** boolean only |
| Auto-create new `Question` from mistake | **No** (deferred) |
| Auto-inject into next revision session | **No** (deferred; would interact with Decision B) |

### 5.5 Mistake → future question (resolved scope for Phase 4)

| Behavior | Phase 4 decision |
|---|---|
| Capability required by product | Yes — represented by `turnedIntoQuestion` + linkage to existing `questionId` when known |
| Automatic creation of new bank JSON / DB questions | **Deferred** |
| Reuse existing question-bank records | **Required:** auto mistakes reference `questionId` when from a session log; never clone prompt into a second Question row |
| Effect on scheduling | **None** — mistakes do not change `intervalDays` / `nextRevisionDate` |
| Effect on status | **None directly** — status comes from session outcome only |
| Effect on future revision selection | **None in Phase 4** — Today’s Revision continues Decision B freeze + due-topic selection |

**Later (explicitly deferred):** curated “promote mistake to PRACTICE question,” AI rewrite, or weighted reappearance inside revision — only with a new approved design that preserves G3/G4/G5/B.

### 5.6 Duplicates and retries

- Auto-create keyed by `sourceSessionLogId` (unique) once schema supports it; duplicate complete must not insert again.
- Manual creates are not deduped by text in v1 (owner responsibility); optional future hash.
- Answer upserts while OPEN may change correctness/confidence; mistakes are generated from the **final** logs at complete time only.

### 5.7 Competing options

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Auto + manual; no auto Question insert** (recommended) | Matches schema flag; safe; no bank churn | Mistake→question is partially manual | **Choose for Phase 4** |
| B. Auto-insert new Question rows | Full automation | Duplicates bank; seed/contract conflict; Decision B risk | Reject for Phase 4 |
| C. Manual-only mistakes | Simpler | Weak vs “mistakes trackable” success criterion | Reject as sole mode |

---

## 6. Deep Dive Queue and notes scope

### 6.1 In scope

- List Deep Dive topics (topics with `DeepDiveNote`, prioritizing `status === RED`).
- Read/update `reason` and owner `notes`.
- Auto-ensure note when status becomes Red (§4.8).
- Owner can remove a topic from the queue (delete note) without forcing status change (status remains until next completed session).

### 6.2 Out of scope

- Automatic return-to-Day-1 beyond existing G5 Reset.
- Full study curriculum / resource browser.
- Forcing Practice mode sessions.

---

## 7. Progress and dashboard enhancements

### 7.1 In scope

- Show counts: topics by status (Green / Yellow / Red).
- Deep Dive count + link.
- Unresolved mistake count + link.
- Keep due/overdue summary + Today’s Revision CTA (Phase 3).
- Optional: due-topic **name list** if a thin authenticated read is added (carry-forward from Phase 3 limitation)—only if Step 1 chooses extend-today vs new summary endpoint.

### 7.2 Prefer

- Derive from `Topic` / `Mistake` / `DeepDiveNote` / session data (G6).
- Do **not** introduce `DailyProgress` writers unless a Step 1 spike proves queries insufficient.

### 7.3 Non-goals

- Analytics charts, streaks gamification, leaderboards (spec non-goals).

---

## 8. Ordered development steps

### Step 0 — Approve this Development Order

| | |
|---|---|
| **Goal** | Owner approves Phase 4 scope, §3 constraints, §4 status v1, §5 mistake scope, and this sequence. |
| **Depends on** | This document; tracker §5.7; spec §§5.4, 5.7–5.8, §11–§12. |
| **Expected files** | Docs only (`CURRENT_STEP.md`, tracker). |
| **Boundaries** | No feature code. |
| **Acceptance** | Written approval recorded; open conflicts resolved or explicitly deferred in §12. |
| **Tests** | N/A. |
| **Evidence** | Tracker §1 + §8 updated; `CURRENT_STEP.md` moves to Step 1. |

**Step 0 result — approved 2026-10-23.** Owner approved the Phase 4 scope in §§1–2, the preserved constraints in §3, the status policy in §4, and the Mistake Log / Deep Dive scope in §§5–7. The approved delivery workflow (AI model responsibilities, token-efficient development, branching/deployment, and learning objective) is recorded in §9.1. No feature implementation is authorized until Step 1 architecture lock is complete.

---

### Step 1 — Architecture lock (status, mistakes, Deep Dive, APIs) — ✅ Complete (2026-10-23)

| | |
|---|---|
| **Goal** | Lock HTTP shapes, Mistake schema extension fields, complete-path side-effect checklist, dashboard data source choice. |
| **Depends on** | Step 0. |
| **Expected files** | Planning updates in `CURRENT_STEP.md` / this DO / tracker only (still no app code unless a tiny design spike is separately approved). |
| **Boundaries** | No migrations yet; no API handlers; no application source changes. |
| **Acceptance** | Decision tables for: complete transaction order; Mistake unique key; Deep Dive upsert rules; summary endpoint vs extend `GET /api/topics` / today; FE routes list. |
| **Tests** | N/A (design review). |
| **Evidence** | §2.5 in this file; tracker §8.3 / §8.4; `CURRENT_STEP.md` Step 1 complete. |

**Step 1 result — architecture locked 2026-10-23.** Full decision tables live in **§2.5**. Summary: reuse `Topic.status` (no new status columns); additive Mistake provenance + `resolvedAt` + unique `sourceSessionLogId`; complete-path order schedule→status→Deep Dive ensure→auto-mistakes inside existing finalize transaction; thin `GET /api/progress` for dashboard counts (no `DailyProgress` writes; due-topic name list deferred); Mistake / Deep Dive HTTP shapes under empty `api/mistakes` / `api/deep-dive`; FE-local services + `/mistakes` + `/deep-dive` routes. No unresolved owner decisions block Step 2.

---

### Step 2 — Status policy helpers (pure)

| | |
|---|---|
| **Goal** | Implement `phase4-status-v1` as pure functions (outcome → status + reason) with unit tests. |
| **Depends on** | Steps 0–1. |
| **Expected files** | e.g. `api/_lib/status/` (mirroring scheduling helpers). |
| **Boundaries** | No Prisma writes; no HTTP; do not modify G5 modules’ behavior. |
| **Acceptance** | Mapping table §4.3 covered; insufficient-history helper documented; policy version constant exported. |
| **Tests** | New `test:status` (or equivalent) covering scenarios in §4.9. |
| **Evidence** | Test command pass recorded in `CURRENT_STEP.md`. |

---

### Step 3 — Schema migration (Mistake provenance)

| | |
|---|---|
| **Goal** | Apply §2.5.2 additive Mistake fields: nullable FKs / `resolvedAt` / unique `sourceSessionLogId`. No new RevisionSession/Topic status columns. |
| **Depends on** | Step 1 ✅; Step 2 may proceed in parallel for pure helpers. |
| **Expected files** | `prisma/schema.prisma`; new migration under `prisma/migrations/`. |
| **Boundaries** | No product UI; no question-bank JSON changes; do not drop Phase 3 tables. |
| **Acceptance** | `prisma validate`; migrate on disposable/dev first, then Neon deploy; existing revision tests still meaningful. |
| **Tests** | Guard/integration smoke as appropriate; revision regression suites. |
| **Evidence** | Migration name + date in tracker. |

---

### Step 4 — Complete-path integration (status + Deep Dive ensure + auto mistakes)

| | |
|---|---|
| **Goal** | On first successful complete: apply status v1; ensure Deep Dive on Red; auto-create mistakes; preserve G5 schedule behavior and idempotency. |
| **Depends on** | Steps 2–3. |
| **Expected files** | `api/_lib/revision/completeService.ts` (+ helpers); complete handler tests. |
| **Boundaries** | No answer-submit side effects; no bank-wide questions API; no auto Question insert. |
| **Acceptance** | Duplicate complete does not double-write status/mistakes; G5 tests still pass; status tests pass with DB where required. |
| **Tests** | Extend `test:revision-write`; status unit tests; targeted integration cases. |
| **Evidence** | Pass counts in working record. |

---

### Step 5 — Mistake Log APIs

| | |
|---|---|
| **Goal** | Authenticated list/detail/create/update/resolve (and optional delete) under `api/mistakes` (or equivalent). |
| **Depends on** | Step 3; Step 4 for auto-created data realism. |
| **Expected files** | `api/mistakes/**`, `_lib` services, Postman entries. |
| **Boundaries** | Bearer auth; no secrets in logs; no auto question generation endpoint. |
| **Acceptance** | Missing/invalid/valid token cases; idempotent constraints honored. |
| **Tests** | Handler + integration tests; Postman examples. |
| **Evidence** | Working record. |

---

### Step 6 — Deep Dive Queue APIs

| | |
|---|---|
| **Goal** | Authenticated list + update notes/reason + remove-from-queue. |
| **Depends on** | Step 3; Step 4 auto-ensure. |
| **Expected files** | `api/deep-dive/**` (or equivalent). |
| **Boundaries** | Does not mutate schedule fields. |
| **Acceptance** | Queue reflects notes; Red ensure visible after RESET complete. |
| **Tests** | API tests + auth matrix. |
| **Evidence** | Working record. |

---

### Step 7 — Progress / dashboard summary API

| | |
|---|---|
| **Goal** | Implement locked `GET /api/progress` (§2.5.5): status counts + Deep Dive/mistake/due summary without violating G3/G6/G8. |
| **Depends on** | Steps 4–6 (or subset if summary can derive earlier). |
| **Expected files** | `api/progress/index.ts` + `_lib` helper as needed. |
| **Boundaries** | Thin derived read only; no `DailyProgress` writes; no due-topic name list. |
| **Acceptance** | Dashboard can render Phase 4 widgets from authenticated data (+ today for session CTA). |
| **Tests** | Contract tests; auth matrix. |
| **Evidence** | Working record. |

---

### Step 8 — Frontend data access

| | |
|---|---|
| **Goal** | FE-local types + services for mistakes, deep dive, progress/summary; reuse auth interceptor. |
| **Depends on** | Steps 5–7 as applicable. |
| **Expected files** | `src/app/core/api/*` (+ specs). |
| **Boundaries** | No `shared-types/`; no secrets in source. |
| **Acceptance** | Unit tests for clients/error normalization. |
| **Tests** | `ng test` for new services. |
| **Evidence** | Working record. |

---

### Step 9 — Mistake Log UI

| | |
|---|---|
| **Goal** | Authenticated Mistake Log screen: list, detail, edit, resolve. |
| **Depends on** | Step 8. |
| **Expected files** | `src/app/features/mistakes/**`; `app.routes.ts`. |
| **Boundaries** | Mobile-readable; no inventing explanations beyond API data. |
| **Acceptance** | Owner can review auto + manual mistakes end-to-end locally. |
| **Tests** | Component tests; build. |
| **Evidence** | Working record. |

---

### Step 10 — Deep Dive UI

| | |
|---|---|
| **Goal** | Authenticated Deep Dive queue + notes editor. |
| **Depends on** | Step 8. |
| **Expected files** | `src/app/features/deep-dive/**`; routes. |
| **Boundaries** | No schedule editing from this UI. |
| **Acceptance** | Queue usable after Red sessions; notes persist. |
| **Tests** | Component tests; build. |
| **Evidence** | Working record. |

---

### Step 11 — Dashboard enrichment + navigation

| | |
|---|---|
| **Goal** | Extend `/dashboard` with status counts, Deep Dive + Mistake summaries/CTAs; keep Today’s Revision primary CTA (G7). |
| **Depends on** | Steps 7–10. |
| **Expected files** | `dashboard.page.*`; optional nav links in shell. |
| **Boundaries** | No analytics overload; cards only where they aid action. |
| **Acceptance** | Spec §5.5 “what should I do right now?” improved with Phase 4 signals. |
| **Tests** | `ng test`; build. |
| **Evidence** | Working record. |

---

### Step 12 — Local end-to-end verification

| | |
|---|---|
| **Goal** | Full Phase 4 quality bar locally + Phase 3 regression. |
| **Depends on** | Steps 2–11. |
| **Work** | Run unit/integration suites; Postman; manual loop: revise → complete → status/mistake/deep dive → dashboard. |
| **Acceptance** | Suites green; owner-confirmed manual smoke; health/topics/revision regression. |
| **Tests** | All Phase 3 + Phase 4 commands agreed in working record. |
| **Evidence** | Matrix or owner confirmation recorded (prefer written matrix this phase). |

---

### Step 13 — Production smoke testing

| | |
|---|---|
| **Goal** | Verify deployed Phase 4 flows on Vercel + Neon. |
| **Depends on** | Verified production deploy + env. |
| **Work** | Auth matrices; read paths first; careful mutation checks; no secrets in logs/docs. |
| **Acceptance** | Owner-reported or filed evidence for status/mistake/deep dive + Phase 3 loop. |
| **Evidence** | Tracker / working record (prefer granular statuses this phase). |

---

### Step 14 — Documentation closeout and handoff

| | |
|---|---|
| **Goal** | Tracker §6.3 lifecycle: transfer history; clear `CURRENT_STEP.md` only after verified transfer; Phase 5 handoff. |
| **Depends on** | Steps 0–13. |
| **Boundaries** | Do not auto-start Phase 5 implementation. |
| **Acceptance** | Exit criteria §11 checked; Phase 4 marked complete in tracker when truly done. |
| **Evidence** | Tracker Phase 4 section finalized. |

---

## 9. Cross-cutting requirements

| Area | Requirement |
|---|---|
| **API** | Bearer auth on all new routes; consistent JSON error envelopes; never expose secrets |
| **Auth** | Reuse `api/_lib/auth.ts` and Angular interceptor/guard patterns |
| **Frontend** | Standalone Angular; FE-local types (G8); default entry remains Today’s Revision (G7) |
| **Database** | Prefer existing models; migrate only for approved Mistake provenance / audit needs |
| **Testing** | Policy unit tests; API integration; FE tests; Postman updates; Phase 3 regression always |
| **UX** | Clear Green/Yellow/Red meaning; separate confidence controls remain as in Phase 3; empty states for empty queues |
| **Logging** | Structured diagnostics; never log bearer tokens |
| **Seeds** | Do not regenerate question bank as a Phase 4 prerequisite; seed changes only if Mistake/Deep Dive seed fixtures are needed for tests |

### 9.1 Approved AI-assisted development workflow (Step 0, 2026-10-23)

This workflow governs how Phase 4 work is planned, implemented, and verified. It changes **how** approved work is delivered, not **what** the product does.

**AI model responsibilities**

| Agent | Use for |
|---|---|
| **Cursor (paid model) — primary** | Main repository investigation, architecture decisions, implementation, complex debugging, integration, and final verification |
| **OpenCode (free models)** | Bounded, low-risk tasks: documentation drafts, file explanations, test checklists, edge-case suggestions, and independent reviews |

- AI-generated claims are **not** verification. Evidence is actual repository contents, command output, test results, API responses, and deployment results.
- Use a second model only when an independent review is useful or the first model's output is uncertain.

**Token-efficient development**

1. Do not repeatedly send or re-investigate the entire repository.
2. Use focused tasks with the relevant files, requirements, and expected outcomes.
3. Implement in small, verifiable units.
4. Run targeted tests during development and broader tests at integration checkpoints.
5. Use free models for preparation and bounded reviews; use Cursor for complex or high-risk work.
6. Keep the developer involved in understanding changes, reviewing diffs, approving decisions, and verifying results.

**Branching and deployment (lightweight)**

- `master` remains the production branch.
- Use short-lived feature branches for meaningful changes.
- Review the diff and run relevant checks before merging.
- Use existing GitHub checks and Vercel Preview deployments where configured; do not duplicate existing infrastructure.
- Keep preview and production database environments isolated.
- Test migrations against a disposable or development database before production.
- Verify meaningful production changes with an appropriate smoke test.
- Do **not** introduce permanent `develop`, `staging`, or `release` branches or unnecessary release bureaucracy.

**Learning objective**

The owner wants to understand and learn from AI-assisted development rather than blindly accept generated code. For meaningful tasks, the workflow should encourage understanding the relevant files and data flow, reviewing implementation decisions, verifying behavior, and completing a small learning exercise where practical. This is a workflow objective only; it does **not** authorize new learning-system features in Phase 4.

---

## 10. Phase 3 regression requirements

Before marking any implementation step complete that touches `completeService` or shared auth:

1. `npm run test:scheduling` (G5/ladder/calendar unchanged in intent).
2. `npm run test:revision-today`.
3. `npm run test:revision-write` (extended, not weakened).
4. `GET /api/health` and `GET /api/topics` still succeed under prior contracts.
5. Today’s Revision + dashboard still usable; complete still finalize-once.

Do not “fix” regressions by loosening G5 assertions.

---

## 11. Phase 4 exit criteria

- [x] Step 0 approval recorded; §4 and §5 policies approved (or amended with version bump).
- [ ] `phase4-status-v1` implemented, tested, and applied only on finalize-once complete.
- [ ] G5 scheduling behavior unchanged (`phase3-g5-v1`).
- [ ] Mistake Log usable (auto + manual + resolve); no automatic Question bank inserts.
- [ ] Deep Dive Queue usable with notes; Red ensure behavior verified.
- [ ] Dashboard shows status / Deep Dive / mistake progress signals.
- [ ] G3/G8 honored; G6 not violated without documented exception.
- [ ] Local verification + production smoke recorded.
- [ ] Tracker history + Phase 5 handoff complete; `CURRENT_STEP.md` cleared per §6.3.

---

## 12. Risks, assumptions, and decisions requiring future approval

| Item | Notes |
|---|---|
| **Owner approval of §4 / §5** | Approved at Step 0 (2026-10-23) |
| **Mistake schema extensions** | **Locked in §2.5.2** for Step 3 migration |
| **Complete response DTO growth** | **Locked in §2.5.5** (`topicStatus` + `mistakesCreated`); FE contract tests in Steps 8/11 |
| **Empty `api/mistakes` / `deep-dive` / `progress` dirs** | Confirmed 0 files; populate in Steps 5–7 per §2.5.5 |
| **Dashboard data source** | **Locked:** thin `GET /api/progress`; due-topic name list remains deferred |
| **Spec §12 stale wording** | §12.1 / §12.7 still say “pending Step 0 approval” in the working-tree `PROJECT_SPECIFICATION.md` though Step 0 is approved — spec changes remain deferred and excluded from the Phase 4 documentation commit (owner decision); treat this DO + tracker as Phase 4 authority |
| **`LOCAL_README.md`** | File exists and documents migrate/seed; tracker link is valid (not missing) |
| **Production evidence culture** | Prefer filing granular smoke results (Phase 3 gap) |
| **Assumption** | Single-user bearer architecture remains (spec §7) |
| **Assumption** | Existing Neon is the migration target unless owner says otherwise |
| **Step 1 owner blockers** | **None** — all required architecture decisions dispositioned in §2.5 |

---

## 13. Documentation closeout requirements

1. Keep this file as the completed baseline when Phase 4 finishes (mirror Phase 3).
2. Transfer durable decisions and verification into `PROJECT_TRACKER.md`.
3. Update `PROJECT_SPECIFICATION.md` §12 items only as part of a separately approved product-document change (Step 0 approval deliberately leaves the specification unchanged; broader product changes are deferred).
4. Clear `CURRENT_STEP.md` only after tracker transfer (§6.3).
5. README / LOCAL_README cross-links stay accurate.

---

## 14. Documentation inconsistencies (known) and resolutions

| Inconsistency | Resolution in this planning task |
|---|---|
| Spec §12.3 suggested bank-wide questions API “may be required by Phase 3” | **Correct** spec to state Phase 3 G3: not required; remains out unless a future phase reopens with demonstrated need |
| `QUESTION_BANK_FORMAT.md` §10 “Future Step 10” | **Correct** to past tense: Step 10 complete; loader rules are current requirements |
| Plan in `CURRENT_STEP.md` vs separate Development Order | **Both:** this file = canonical detailed plan; `CURRENT_STEP.md` = active-step tracker (Phase 3 pattern) |

---

## 15. Current planning status

| Field | Value |
|---|---|
| **Document status** | Step 1 architecture lock complete; Step 2 next |
| **Phase 4 complete?** | **No** |
| **Feature implementation started?** | **No** (Step 2 may begin pure status helpers only) |
| **Step 0** | ✅ Approved 2026-10-23 (scope, §4 status policy, §§5–7 mistake/Deep Dive scope, §9.1 workflow) |
| **Step 1** | ✅ Complete 2026-10-23 — decisions in §2.5 |
| **Next action** | Step 2 — status policy helpers (`api/_lib/status/`) + unit tests |
| **Blocking product gates** | None |

**Canonical plan:** `JavaScript_Fluency_System_Phase_4_Development_Order.md`
