# CURRENT_STEP — Phase 4 (active working record)

> **Phase:** 4 — Progress + Mistakes  
> **Mode:** Step 1 architecture lock complete (2026-10-23); Step 2 next — **product feature APIs/UI not started**  
> **Canonical detailed plan:** [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md)  
> **Overall tracker:** [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)  
> **Product/architecture:** [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)  
> **Phase 3 baseline (complete):** [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)

---

## 1. Active task

| Field | Value |
|---|---|
| **Active step** | **Step 2 — Status policy helpers (pure)** |
| **Status** | Next (not started) |
| **Implementation** | Not started for product features; Step 2 may begin pure helpers + unit tests only |

### Step 0 — Approved (2026-10-23)

The owner approved Phase 4 scope, G1–G8 / Decisions A–B, `phase4-status-v1`, Mistake Log + Deep Dive scope, and the AI-assisted delivery workflow. Details: Development Order §§1–7, §9.1.

### Step 1 — Complete (2026-10-23)

Architecture lock finished via repository investigation (docs only; no app/schema/test code changes). Canonical decisions: Development Order **§2.5**. Durable summary: tracker **§8.3**.

#### Step 1 completion criteria (all met)

1. ✅ HTTP shapes locked for Mistake Log, Deep Dive, and `GET /api/progress`.
2. ✅ Mistake schema extensions + unique nullable `sourceSessionLogId` locked.
3. ✅ Complete-path side-effect order locked (schedule → status → Deep Dive ensure → auto-mistakes) with duplicate handling.
4. ✅ Dashboard data source chosen: thin `GET /api/progress` (not DailyProgress; due-topic name list deferred).
5. ✅ FE routes/services listed; decisions copied into `PROJECT_TRACKER.md`.

#### Key locked decisions (summary)

| Area | Lock |
|---|---|
| Status persistence | Reuse `Topic.status`; no new Topic/RevisionSession status columns; audit via complete `topicStatus` DTO |
| Mistake schema | Additive `questionId?`, `sessionId?`, `sourceSessionLogId?` (@unique), `resolvedAt?`; SetNull FKs |
| Deep Dive ensure | Create-if-missing on Red only; never wipe notes/reason on existing notes |
| Dashboard | `GET /api/progress` derived counts; keep today for session CTA |
| FE | FE-local types; `/mistakes`, `/deep-dive`; enrich `/dashboard`; G7 entry unchanged |

#### Unresolved owner decisions

**None** blocking Step 2. Pre-existing doc inconsistency: `PROJECT_SPECIFICATION.md` §12.1 / §12.7 still say “pending Step 0 approval” — owner deferred main-spec edits; Phase 4 DO + tracker are authoritative for Phase 4.

---

## 2. Process conventions (from Phase 3)

1. Canonical detailed plan lives in the Phase Development Order file; this file is the active-step working record.
2. Do not mark a step complete from documentation or code creation alone—verify with evidence when implementation begins.
3. Prefer minimal scope; reuse existing conventions (`api/_lib/*`, bearer auth, FE-local types).
4. Never hard-code or expose secrets (especially bearer tokens).
5. Do not silently change G1–G8 or Decisions A/B.
6. Update this file as steps progress; sync meaningful project-wide status into the tracker (§6.2).
7. On phase completion: transfer history to the tracker, then clear this file only after verified transfer (§6.3).

---

## 3. Planning summary (approved)

### Preserved

- Backend-authoritative scheduling; ladder 1 / 3 / 7 / 14 / 30; G5 confidence scheduling; finalize-once complete; no bank-wide questions API; no new `shared-types/` package usage for Phase 4 contracts.

### Approved status v1 (`phase4-status-v1`)

- Recalculate **only** on first successful `POST /api/revision/complete`.
- Map G5 outcome: `ADVANCE`→Green, `REINFORCE`→Yellow, `REINFORCE_AT_1`/`RESET`→Red.
- Insufficient history: never-completed topics keep default/prior status (default Red).
- Does not modify G5 interval/due-date writes.

### Approved Mistake Log MVP

- Auto-create on complete for incorrect answers or correct+`DIDNT_UNDERSTAND`.
- Manual create/edit/resolve; `turnedIntoQuestion` is **manual only**.
- **No** automatic new Question bank rows; reuse `questionId` linkage (schema in Step 3).
- Mistakes do not bypass scheduling rules.

### Approved sequence (high level)

Step 0 ✅ → Step 1 ✅ → **Step 2** status helpers → Step 3 schema → Step 4 complete-path side effects → Steps 5–7 APIs → Steps 8–11 Angular → Steps 12–14 verify + closeout.

### Approved workflow

Cursor primary; OpenCode free models for bounded tasks; evidence over AI claims; token-efficient focused tasks; lightweight `master` + short-lived feature branches — Development Order §9.1 / tracker §8.5.

---

## 4. Next step

1. Execute **Step 2 — Status policy helpers**: pure `phase4-status-v1` functions under e.g. `api/_lib/status/`, export policy version constant, unit tests (`test:status` or equivalent).
2. Do **not** start Step 3 migration or complete-path integration until Step 2 acceptance is met (Step 3 may proceed in parallel with Step 2 per Development Order, but prefer finishing helpers first for a clean review).
3. Follow transaction order and contracts in Development Order §2.5 when later steps begin.

---

## 5. Explicit non-goals for the current moment

- Do not implement Mistake/Deep Dive/progress HTTP handlers or Angular feature screens until their steps are active.
- Do not apply Prisma migrations in Step 2.
- Do not re-open Phase 3 delivery or edit `PROJECT_SPECIFICATION.md` unless the owner separately approves.
- Do not treat question-bank re-validation/seeding as a Phase 4 Step 2 task.

---

## 6. Working log

| Date | Note |
|---|---|
| 2026-10-22 | Phase 4 formally started in planning mode. Created Phase 4 Development Order; initialized this file; updated tracker snapshot. Feature implementation not started. |
| 2026-10-23 | Step 0 approved by owner: Phase 4 scope, G1–G8 / Decisions A–B, `phase4-status-v1`, Mistake Log / Deep Dive scope, and AI-assisted delivery workflow. Step 1 architecture lock became the active design step. No feature code started. |
| 2026-10-23 | Step 1 complete: investigated schema, complete/answer/today paths, auth, Angular shell/dashboard, tests/migrations; locked architecture in Development Order §2.5; synced tracker §8. Docs-only change set. Next: Step 2 status helpers. |
