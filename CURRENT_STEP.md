# CURRENT_STEP — Phase 4 (active working record)

> **Phase:** 4 — Progress + Mistakes  
> **Mode:** Steps 2–7 backend complete and verified for `master` (2026-10-24); Step 8 next — Frontend data access (**not started**)  

> **Canonical detailed plan:** [`JavaScript_Fluency_System_Phase_4_Development_Order.md`](./JavaScript_Fluency_System_Phase_4_Development_Order.md)  
> **Overall tracker:** [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)  
> **Product/architecture:** [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)  
> **Phase 3 baseline (complete):** [`JavaScript_Fluency_System_Phase_3_Development_Order.md`](./JavaScript_Fluency_System_Phase_3_Development_Order.md)

---

## 1. Active task

| Field | Value |
|---|---|
| **Active step** | **Step 8 — Frontend data access** |
| **Status** | Next (not started) |
| **Implementation** | Steps 0–7 complete (backend APIs done); Angular FE types/services/UI **not** started |

### Step 0–6 — Complete (see prior working-log entries)

Status helpers, Mistake schema, complete-path side effects, Mistake APIs, Deep Dive APIs delivered and verified earlier on 2026-10-23/24.

### Step 7 — Complete (2026-10-24)

Authenticated read-only `GET /api/progress` per Development Order **§2.5.5**.

#### Endpoint

| Method / path | Behavior |
|---|---|
| `GET /api/progress` | Bearer-auth summary. Response `{ status, statusCounts: { green, yellow, red }, deepDiveCount, unresolvedMistakeCount, dueCount, overdueCount }`. No query params. No writes. |

#### Metric definitions

| Field | Calculation |
|---|---|
| `statusCounts.*` | Count of `Topic` rows by `Topic.status` |
| `deepDiveCount` | Count of `DeepDiveNote` rows |
| `unresolvedMistakeCount` | Count of `Mistake` where `resolvedAt` is null |
| `dueCount` | Topics with `nextRevisionDate` due today or earlier (Asia/Kolkata); **includes overdue** — same semantics as `GET /api/revision/today` |
| `overdueCount` | Subset of due topics with due date before today (Kolkata) |

#### Files

| File | Purpose |
|---|---|
| `api/_lib/progress/errors.ts` | `ProgressApiError` |
| `api/_lib/progress/progressService.ts` | Read-only aggregation |
| `api/_lib/progress/index.ts` | Barrel exports |
| `api/progress/index.ts` | GET handler |
| `api/progress/index.handler.test.ts` | Auth / method / envelope |
| `api/_lib/progress/progressService.integration.test.ts` | Aggregation + read-only mutation check |
| `package.json` | `test:progress` |
| `postman/collections/Backend/07 - Progress Summary/**` | Postman example |

#### Step 7 acceptance (met)

1. ✅ Contract matches §2.5.5 field set; no `DailyProgress` writes; no due-topic name list.
2. ✅ Bearer auth matrix (missing/invalid → 401; valid → 200).
3. ✅ Aggregation accuracy + empty-shape / non-negative integers verified on disposable DB.
4. ✅ Read-only: topic status/schedule, mistakes, deep-dive notes, `DailyProgress` count unchanged after calls.
5. ✅ Tests (local disposable `jsfluency_test` @ `127.0.0.1`):
   - `test:progress` **7/7**
   - `test:deep-dive` **11/11**
   - `test:mistakes` **12/12**
   - `test:status` **10/10**
   - `test:scheduling` **30/30**
   - `test:prisma-guards` **1/1**
   - `test:revision-write` **31/31**
6. ⚠️ `test:revision-db` still blocked (`inet_server_addr()` = `127.0.0.1/32`). Assertion not weakened.
7. ⬜ Neon / deploy / Angular not touched.

---

## 2. Process conventions (from Phase 3)

1. Canonical detailed plan lives in the Phase Development Order file; this file is the active-step working record.
2. Do not mark a step complete from documentation or code creation alone—verify with evidence.
3. Prefer minimal scope; reuse existing conventions.
4. Never hard-code or expose secrets.
5. Do not silently change G1–G8 or Decisions A/B.
6. Update this file as steps progress; sync tracker (§6.2).
7. On phase completion: transfer history to tracker, then clear this file only after verified transfer (§6.3).

---

## 3. Planning summary (approved)

### Preserved

- Backend-authoritative scheduling; ladder 1 / 3 / 7 / 14 / 30; finalize-once complete; no bank-wide questions API; FE-local types.

### Approved sequence

Step 0 ✅ → … → Step 7 ✅ → **Step 8** FE data access → Steps 9–11 Angular UI → Steps 12–14 verify + closeout.

---

## 4. Next step

1. Execute **Step 8 — Frontend data access**: FE-local types + services for mistakes, deep dive, progress; reuse auth interceptor (G8 — no `shared-types/`).
2. Neon `migrate deploy` for Mistake provenance still requires explicit owner authorization.
3. Do not start Mistakes/Deep Dive/dashboard Angular UI until Steps 9–11.

---

## 5. Explicit non-goals for the current moment

- Do not deploy migration to Neon without explicit owner authorization.
- Do not implement Angular Mistake/Deep Dive/dashboard enrichment UI yet (Steps 9–11).
- Do not edit `PROJECT_SPECIFICATION.md` unless separately approved.

---

## 6. Working log

| Date | Note |
|---|---|
| 2026-10-22 | Phase 4 planning started. |
| 2026-10-23 | Step 0 approved; Step 1 architecture lock complete. |
| 2026-10-24 | Steps 2–6 complete (status helpers, Mistake schema, complete-path, Mistake APIs, Deep Dive APIs). |
| 2026-10-24 | Step 7 complete: `GET /api/progress`; `test:progress` 7/7. |
| 2026-10-24 | Steps 2–7 re-verified for `master` commit: `test:status` 10/10, `test:scheduling` 30/30, `test:prisma-guards` 1/1, `test:revision-write` 31/31, `test:mistakes` 12/12, `test:deep-dive` 11/11, `test:progress` 7/7; `prisma validate` OK. `test:revision-db` still blocked (`127.0.0.1/32`). Neon migrate not run. Step 8 not started. |
