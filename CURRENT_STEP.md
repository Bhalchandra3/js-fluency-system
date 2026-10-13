# Current Step — Phase 3: Revision Scheduling

> Complete working record for the **entire active phase**.
> Overall project progress: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)
> Approved implementation baseline: [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)
> Lifecycle rules: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md) §5

**Status:** In progress — planning initialized; implementation not started  
**Phase:** 3 — Revision Scheduling  
**Active step:** Step 1 — Architecture and scheduling rules (schema readiness)  
**Step 0:** Complete — Development Order formally approved as Phase 3 baseline

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
3. Authenticated submit API records per-answer correctness and confidence; finalizes scheduling at most once per completed session.
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

**Session aggregation precedence:** Incorrect → Reset; else Correct+`DIDNT_UNDERSTAND` → Reinforce at 1; else Correct+`DIFFICULT` → Reinforce; else → Advance.

**Finalization:** Incomplete session → no schedule change. Completed session → finalize at most once. Server-authoritative. Persist answer history, confidence, correctness, session outcome, previous/resulting interval, resulting due date, policy id/version.

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

### Step 1 — Architecture and scheduling rules (schema readiness) — 🔵 Current

| | |
|---|---|
| **Goal** | Lock persistence, evaluation, and API-contract prerequisites before coding helpers/APIs |
| **Depends on** | Step 0 |
| **Work** | Resolve the four explicit unknowns below; confirm ladder/G5 fit existing or minimal schema |
| **Verification** | Written decision table in §9; migration plan only if proven necessary |
| **Completion** | Persistence + evaluation + path/contract approach locked; then Step 2 may begin |

#### Four explicit unknowns (mandatory Step 1 deliverables)

1. **HTTP paths:** Finalize revision read and submission endpoint paths and API contracts before Steps 3–4. Recommendation to evaluate: `api/revision/…` (not locked until Step 1 closes).
2. **Persistence and audit structure:** Inspect Prisma schema; determine whether `SessionLog` + topic scheduling fields can safely represent session outcome, previous/resulting interval, resulting due date, and scheduling rationale. Prefer existing models; new schema only with evidence (and approval if required).
3. **Non-MCQ scoring:** Inspect supported `QuestionFormat` values; define explicit evaluation policy per format before answer evaluation. Do **not** assume exact-text matching is appropriate.
4. **Correct-answer exposure:** Finalize when reference answers and explanations may be returned. Do **not** expose `correctAnswer` in the initial question payload when backend evaluation is required.

**Resolution criteria for Step 1:** Each unknown has a written decision, rationale, affected steps, and (if any) schema/migration implication.

### Step 2 — Scheduling helpers — ⬜

| | |
|---|---|
| **Goal** | UTC storage + Asia/Kolkata due/overdue + ladder transitions |
| **Depends on** | Step 1 |
| **Expected** | Likely `api/_lib/*` (names TBD) |
| **Verification** | Unit tests: IST midnight, date transitions, conversions, ladder edges, unsupported-interval prevention, G5 precedence |
| **Completion** | Helpers pass deterministic tests |

### Step 3 — Today’s Revision read API — ⬜

| | |
|---|---|
| **Goal** | Authenticated read; embedded REVISION questions; empty-due |
| **Depends on** | Step 2; Step 1 paths/contracts + exposure rules |
| **Verification** | Auth matrix; contract tests; empty/due/overdue; no pre-eval answer leak; health/topics regression |
| **Completion** | Local verified read API |

### Step 4 — Answer/confidence submission API — ⬜

| | |
|---|---|
| **Goal** | Evaluate + persist + finalize schedule once |
| **Depends on** | Steps 2–3; Step 1 evaluation + persistence |
| **Verification** | Every G5 row; aggregation precedence; incomplete = no schedule change; duplicate finalize blocked; Incorrect ≠ confidence override; atomicity |
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
- [ ] Incomplete sessions do not finalize; completed sessions finalize once
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
| 0 | ✅ Complete | Development Order approved; phase started |
| 1 | 🔵 Current | Four unknowns pending resolution — no implementation yet |
| 2–4 | ⬜ | Blocked on Step 1 |
| 5 | N/A | G3 |
| 6–11 | ⬜ | Not started |

**Exact stopping point:** Phase initialized; awaiting Step 1 architecture decisions.  
**Next action:** Execute Step 1 (resolve four unknowns; lock persistence/evaluation/paths). Do not implement Steps 2+ until Step 1 completion criteria are met.

---

## 9. Decision records

### 9.1 Resolved at phase start (G1–G8)

See §3 and approved Development Order §§2–4. Do not reopen unless a blocking contradiction appears.

### 9.2 Step 1 resolution log (to fill during Step 1)

| Unknown | Decision | Rationale | Affects | Schema impact |
|---|---|---|---|---|
| HTTP paths | _pending_ | | Steps 3–4, 6 | |
| Persistence/audit | _pending_ | | Steps 2, 4, 7 | |
| Non-MCQ scoring | _pending_ | | Steps 4, 7 | |
| Correct-answer exposure | _pending_ | | Steps 3–4, 7 | |

---

## 10. Verification outcomes

_None yet — implementation not started._

---

## 11. Unresolved issues

| Issue | Owner step | Notes |
|---|---|---|
| Four explicit unknowns | Step 1 | Mandatory before Steps 3–4 |
| No Angular routes/guards yet | Steps 6–7 | Minimal token gate to introduce |
| Possible schema gap for session audit fields | Step 1 | Prefer existing models first |

---

## 12. Handoff requirements (end of phase)

When Phase 3 completes: finalize this file’s history/decisions/conclusions; transfer summary + Phase 4 handoff into [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md); verify transfer; **then** clear this file. Do not auto-start Phase 4.

**Phase 4 preview:** Status algorithm, Mistake Log, Deep Dive Queue, richer progress—using Phase 3 session history and schedule fields.
