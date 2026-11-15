# JavaScript Fluency System — Phase 7 Development Order

> Canonical detailed plan for **Phase 7 — Learning-flow algorithm & MCQ-only revision** (post-MVP).
> Product phase label in the specification remains “AI assistance”; **delivery is zero-cost and non-LLM** (tiered escalate + C1 MCQ revision + offline bank batches).
> Active working record: [`CURRENT_STEP.md`](./CURRENT_STEP.md)
> Overall progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) §§8–9, 11
> Question-bank contract: [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md)
> Phase 6 completed baseline: [`docs/archive/JavaScript_Fluency_System_Phase_6_Development_Order.md`](./docs/archive/JavaScript_Fluency_System_Phase_6_Development_Order.md)
>
> **Rule:** Complete and verify each step before moving to the next.

---

## 1. Phase 7 Objective

Improve daily fluency correction **without** hosted LLM APIs and **without** per-mistake owner busywork:

1. **C1 — MCQ-only graded revision:** Today’s Revision grades only via `MULTIPLE_CHOICE` server index compare. Convert all `REVISION` + `SHORT_ANSWER` bank items to MCQ; block `SHORT_ANSWER` on the revision path.
2. **Tiered learning-flow algorithm:** Escalate deeper repair only on deterministic patterns using existing Topic status, Mistake Log, and Deep Dive data (Tiers 0–3).
3. **Offline MCQ bank batches:** When a topic needs more coverage, expand via JSON → validate → manual seed/DB update (Neon free-tier safe).
4. **Preserve MVP loop:** G5 scheduling, finalize-once complete, `phase4-status-v1`, and core learning without Phase 7 UI (§8.9).

---

## 2. Locked decisions (Step 0)

| Decision | Choice |
|---|---|
| **Cost** | Maintain **$0** stack |
| **LLM** | No hosted LLM API keys; no in-app model calls |
| **Mistake help** | No AI / heavy analysis on every mistake |
| **Graded revision (C1)** | Today’s Revision = **MCQ only** |
| **SHORT_ANSWER in revision** | Convert out of REVISION; do not use blind self-grade as the long-term path |
| **PRACTICE formats** | `OUTPUT_PREDICTION` / `DEBUGGING` / `CODE_WRITING` stay out of Today’s Revision unless a later phase adds them explicitly |
| **Bank growth** | Offline JSON batches → owner review → seed/manual DB update |
| **Neon** | No high-volume AI writes; rare batch seeds only |
| **G5 / Phase 3–4** | Unchanged finalize-once and status policy |

### Tier model

| Tier | Behavior |
|---|---|
| **0** | Today’s Revision — MCQ only; server grades; confidence separate; existing side effects |
| **1** | Mistake Log — passive; owner resolves when ready |
| **2** | Deep Dive — when Red; owner-paced notes |
| **3** | Pattern gate — escalate topic repair only when thresholds fire |
| **Offline** | MCQ JSON batch for weak/thin topics when Tier 3 or owner requires |

### Explicit non-goals

- LLM grading or analysis
- Reveal-then-grade SHORT_ANSWER as the revision path
- Per-mistake question generation
- Auto Question insert from mistakes
- Difficulty schema fields / interview-prep mode
- Changing G5 finalize-once behavior

---

## 2.5 Step 1 architecture lock (complete 2026-11-15)

Investigation of the live repository (revision freeze path, answer evaluation, Mistake / Deep Dive / progress APIs, seed bank counts). **No application code was changed in Step 1.** Decisions below are implementation-ready for Steps 2–5.

### 2.5.1 Bank evidence (Phase 7 start)

| Fact | Value |
|---|---|
| `REVISION` + `MULTIPLE_CHOICE` | 55 |
| `REVISION` + `SHORT_ANSWER` | 50 |
| Topics with REVISION questions | 52 |
| Topics with **zero** REVISION MCQ | **0** |
| Topics with only SHORT_ANSWER REVISION | **0** |
| Mixed topics (MCQ + SHORT_ANSWER) | 50 |
| Typical mixed shape | often **1 MCQ + 1 SHORT_ANSWER** per topic |

Therefore filtering new session freezes to MCQ-only does **not** strand any topic that currently has a REVISION bank.

### 2.5.2 C1 revision contract

| Decision | Detail |
|---|---|
| **Allowed format in new Today’s Revision freezes** | `QuestionFormat.MULTIPLE_CHOICE` only, `sessionType: REVISION` |
| **Grading** | Server index compare only (`selectedAnswer === correctAnswer`); unchanged from Phase 3 MCQ path |
| **SHORT_ANSWER in REVISION bank** | Convert to MCQ in Step 2 (content); must not be selected when creating/backfilling new freezes (Step 3) |
| **PRACTICE formats** | Remain out of Today’s Revision |
| **Confidence / G5 / status** | Unchanged (`phase3-g5-v1`, `phase4-status-v1`) |

### 2.5.3 Freeze / fallback rules (Decision B preserved)

| Case | Rule |
|---|---|
| **New OPEN session** | `loadRevisionQuestions` (and empty-association backfill) MUST query `format: MULTIPLE_CHOICE` only. If zero MCQ remain for a due topic, skip that topic (same as today’s zero-REVISION skip); try next due topic. |
| **Existing OPEN sticky session** | **Do not rewrite** frozen `RevisionSessionQuestion` rows (Decision B). Legacy SHORT_ANSWER members may still appear until that session completes. |
| **Answer API during legacy resume** | Keep SHORT_ANSWER self-assess evaluation **only** for questions already frozen on an OPEN session. New freezes never add SHORT_ANSWER. |
| **FE** | Show SHORT_ANSWER UI only if the current frozen question’s format is SHORT_ANSWER (legacy). After Step 2 seed + no legacy OPEN shorts, path is unused. |
| **Mid-conversion safety** | Safe because every topic already has ≥1 REVISION MCQ (§2.5.1). |

### 2.5.4 Pattern-gate policy `phase7-pattern-gate-v1`

Deterministic, read-only over existing rows. **No new Prisma models.** Policy version string: `phase7-pattern-gate-v1`.

| Gate ID | Condition | Signal code | Primary CTA |
|---|---|---|---|
| `pg-unresolved-3` | `count(Mistake where topicId=T AND resolvedAt IS NULL) >= 3` | `UNRESOLVED_MISTAKE_CLUSTER` | `/mistakes` |
| `pg-red-repeat` | Topic’s **two most recent** `RevisionSession` with `status=COMPLETED` both have `outcome` in `{ RESET, REINFORCE_AT_1 }` | `REPEATED_RED` | `/deep-dive` |
| `pg-question-miss-2` | Same `questionId` has `count(SessionLog where correct=false) >= 2` | `REPEATED_QUESTION_MISS` | `/mistakes` (topic-scoped when UI allows) |
| `pg-thin-mcq-3` | `count(Question where topicId=T AND sessionType=REVISION AND format=MULTIPLE_CHOICE) < 3` **AND** (`Topic.status=RED` OR unresolved mistakes for T ≥ 1) | `THIN_MCQ_COVERAGE` | Offline MCQ batch runbook (owner content), not an in-app generator |

**Severity order (highest first):** `REPEATED_RED` → `UNRESOLVED_MISTAKE_CLUSTER` → `REPEATED_QUESTION_MISS` → `THIN_MCQ_COVERAGE`.

**Presentation cap:** API/UI surfaces at most **5** topic-level escalation items per response (collapse multiple gates per topic into one card with gate codes listed). Commute-safe; no modal blocking Today’s Revision.

**Non-firing:** Gates never change schedule, status, or Mistake rows. Advisory only.

### 2.5.5 API / FE shape

| Decision | Detail |
|---|---|
| **Escalate read path** | Extend authenticated `GET /api/progress` with an `escalations` array (and `patternGateVersion: "phase7-pattern-gate-v1"`). Reuse existing progress client on Dashboard. **No** new high-churn table. |
| **Escalation item fields** | `topicId`, `topicName`, `topicSlug`, `status`, `gates: string[]` (signal codes), `unresolvedMistakeCount`, `revisionMcqCount` |
| **FE (Step 5)** | Dashboard progress panel: short “Needs attention” list with links to Mistakes / Deep Dive; never blocks revision CTA |
| **G8** | FE-local types only; no `shared-types/` package |

### 2.5.6 Neon / write budget

| Allowed writes | Disallowed |
|---|---|
| Existing revision answer/complete/Mistake/Deep Dive paths (unchanged) | Per-answer AI logs, LLM caches, chat transcripts |
| Owner-authorized **batch** seed / DB update after JSON review (Step 2 / offline expansion) | Automatic Question inserts from gates or mistakes |
| No Phase 7 migration required for gates | Speculative schema fields (`difficulty`, etc.) |

### 2.5.7 Step sequencing note

- **Step 2** (content) and **Step 3** (code guard) may proceed with Step 2 batched by topic; Step 3 MCQ filter can ship even before all SHORT_ANSWER rows are converted (fallback §2.5.3).
- **Steps 4–5** depend on §2.5.4 thresholds (locked here — do not reinvent in code).

---

## 3. Execution Order

| Step | Scope | Status |
|---|---|---|
| **0** | Approve Development Order + working-record / tracker sync | ✅ Complete (2026-11-15) — owner approved plan |
| **1** | Architecture lock: C1 contract, pattern-gate thresholds, skip/fallback for non-MCQ REVISION rows, Neon write budget | ✅ Complete (2026-11-15) — §2.5 |
| **2** | Question-bank C1 conversion: rewrite REVISION SHORT_ANSWER → MCQ; validation; merge; seed | ✅ JSON + Neon seed complete (2026-11-15); production C1 verified (MCQ=105, SA=0) |
| **3** | App/API guard: Today’s Revision accepts **MCQ only** | ✅ Complete (2026-11-15) |
| **4** | Pattern-gate helpers + tests (deterministic) | ✅ Complete (2026-11-15) |
| **5** | In-app escalate signals (Dashboard / Deep Dive / Mistakes) when gate fires | ✅ Complete (2026-11-15) |
| **6** | Local verification (tests, bank validation, build; no Neon spam) | ✅ Complete (2026-11-15) |
| **7** | Production smoke + documentation closeout | ⬜ Next |

---

## 4. Step details

### Step 0: Approve Development Order (Complete — 2026-11-15)

- Owner approved Phase 7 plan (tiered algorithm + C1 + $0 / no LLM).
- Initialize [`CURRENT_STEP.md`](./CURRENT_STEP.md); update [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) §1 / §2 / §11.

### Step 1: Architecture lock (Complete — 2026-11-15)

- Documented in **§2.5** (C1 contract, Decision B legacy freeze rule, `phase7-pattern-gate-v1` thresholds, progress `escalations` extension, Neon write budget).
- Repo evidence: zero topics lack REVISION MCQ; MCQ-only freeze is safe mid-conversion.
- No application code changed in Step 1.

### Step 2: Question-bank C1 conversion (JSON complete — 2026-11-15; seed pending)

- Converted **50** `REVISION` + `SHORT_ANSWER` → `MULTIPLE_CHOICE` in [`prisma/seed-data/questions.json`](./prisma/seed-data/questions.json).
- Helper script (reproducible apply): [`scripts/phase7-c1-convert-sa-to-mcq.mjs`](./scripts/phase7-c1-convert-sa-to-mcq.mjs) (already applied; re-run would no-op / fail if no SHORT_ANSWER left).
- Contract validation: **0** errors; `REVISION|MULTIPLE_CHOICE` = **105**; `REVISION|SHORT_ANSWER` = **0**.
- PRACTICE `SHORT_ANSWER` (2) left unchanged (out of Today’s Revision).
- Baseline export (gitignored `.local` if present): prior SA texts preserved locally for audit.
- **Neon seed (2026-11-15):** Owner authorized. Blocked once by OPEN Classes session (0 answers) → session deleted → re-seed `created=0, updated=10, skipped=250`. DB `REVISION` MCQ=105, SA=0.
- **Production seed (2026-11-15):** Owner authorized. `vercel env run --environment production` → OPEN=0; seed `created=0, updated=0, skipped=260`; assert MCQ=105, SA=0, `c1Ok: true`. Production host matches local `.env` (shared Neon).

### Step 3: App/API MCQ-only guard (Complete — 2026-11-15)

- `loadRevisionQuestions` / empty backfill use `REVISION_FREEZE_QUESTION_WHERE` (`REVISION` + `MULTIPLE_CHOICE` only).
- Legacy nonempty OPEN freezes unchanged (Decision B); SHORT_ANSWER answer path kept for those only.
- FE still renders SHORT_ANSWER controls only when a frozen question has that format.
- Verified: `c1FreezeFilter.test.ts` + handler tests; Neon `.env` disposable-topic smoke (`freezeBank` MCQ-only). Integration C1 cases added (need `DATABASE_URL_TEST`).

### Step 4: Pattern-gate helpers + tests (Complete — 2026-11-15)

- Implemented pure `phase7-pattern-gate-v1` in [`api/_lib/patternGate/phase7PatternGateV1.ts`](./api/_lib/patternGate/phase7PatternGateV1.ts) (`evaluateTopicGates`, `buildEscalations`, locked thresholds).
- Unit tests: `npm run test:pattern-gate` — **8/8** pass.
- Prisma/HTTP wiring deferred to Step 5 (extend `GET /api/progress` + Dashboard UI).

### Step 5: Escalate signals API + UI (Complete — 2026-11-15)

- `getEscalationSummary` / `loadTopicGateInputs` → `GET /api/progress` fields `patternGateVersion` + `escalations` (cap 5).
- Dashboard **Needs attention** list with gate labels; CTAs to Mistakes / Deep Dive (thin MCQ shows offline-bank note).
- Verified: progress handler 5/5; dashboard+helper specs 15/15; Neon `.env` read smoke returned 5 escalations.

### Step 6: Local verification (Complete — 2026-11-15)

- `ng test` **110/110**; `ng build` OK (`main-TGQOGEZD.js`).
- Backend: scheduling 30/30, status 10/10, pattern-gate 8/8, prisma-guards 1/1, revision-write 23/23, mistakes 11/11, deep-dive 10/10, progress 5/5 (handler/unit; disposable-DB integrations skipped without `DATABASE_URL_TEST`).
- No LLM packages in dependencies; no seed/migrate during Step 6.

### Step 7: Production smoke + closeout

- Deploy/smoke MCQ-only revision + escalate signals (as delivered).
- Transfer history to tracker; clear `CURRENT_STEP.md` per §6.3.

---

## 5. Exit criteria checklist

- [x] Step 0 approval recorded; this Development Order is the baseline.
- [x] Step 1 architecture lock recorded (§2.5).
- [x] C1: REVISION seed JSON has no SHORT_ANSWER (50 converted; PRACTICE SA residual OK).
- [x] C1: Neon **dev** synced with converted bank (owner-authorized seed 2026-11-15).
- [x] C1: Neon **production** synced (owner-authorized seed 2026-11-15; MCQ=105, SA=0).
- [x] C1: revision path code is MCQ-only for new freezes (Step 3).
- [x] Pattern-gate thresholds locked, implemented, and tested (`test:pattern-gate` 8/8).
- [x] Pattern-gate wired into `GET /api/progress` + Dashboard (Step 5).
- [x] Escalate signals usable without LLM.
- [ ] Offline MCQ batch runbook + validation path documented and exercised at least once (or N/A if no expansion batch needed after conversion).
- [ ] G5 / Phase 4 status behavior unchanged.
- [ ] $0 / no LLM / Neon write discipline held.
- [x] Local verification recorded (Step 6).
- [ ] Production smoke + closeout recorded (Step 7).
- [ ] Tracker history + handoff complete; `CURRENT_STEP.md` cleared per §6.3.

---

## 6. Related links

| Resource | Path |
|---|---|
| Tracker | [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) |
| Active working record | [`CURRENT_STEP.md`](./CURRENT_STEP.md) |
| Specification | [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md) |
| Question-bank format | [`prisma/seed-data/QUESTION_BANK_FORMAT.md`](./prisma/seed-data/QUESTION_BANK_FORMAT.md) |
| Questions seed | [`prisma/seed-data/questions.json`](./prisma/seed-data/questions.json) |
