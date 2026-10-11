# Current Step — Phase 2 Step 10 (Seed Questions into Neon)

> Working record for the active step only.
> Overall status: [`PROJECT_TRACKER.md`](./PROJECT_TRACKER.md)
> Product/architecture: [`PROJECT_SPECIFICATION.md`](./PROJECT_SPECIFICATION.md)

**Status:** Complete

**Phase:** 2 — Topics + Questions

**Step:** 10 — Load questions through the seed process

---

## 1. Objective

Load the validated 260-question bank into Neon via `prisma/seed.ts`, reconcile obsolete prompt rows from pre-review seeds, and verify Topic → Question relationships against `questions.json`.

**Out of scope:** deployment, production smoke tests, schema/migration changes, question-content edits.

---

## 2. Execution summary (verified)

### Phase A — Backup

- Target confirmed Neon (`*.neon.tech` hostname only; credentials not logged).
- Baseline before writes: topics **52**, questions **260**, 5/topic, 0 orphans, 0 duplicate prompts, SessionLog/Mistake **0**.
- Backed up all **9** obsolete records to:
  `.local/step10-backups/obsolete-questions-2026-10-11T16-40-47-638Z.json`
  (directory ignored via `/.local/` in `.gitignore`; backup verified 9/9 IDs present).

### Phase B — Seed

```bash
npx prisma db seed
```

Result: `created=9, updated=7, skipped=244` (exit 0). Post-seed question count temporarily **269**.

### Phase C — Pre-delete verification

- Replacement questions vs JSON indexes 43, 87, 100, 101, 114, 141, 159, 198, 213: **9/9** match.
- Content-only IDs updated in place: **7/7** match.
- SessionLog/Mistake still 0.
- All 9 obsolete IDs still present with expected topic slugs → safe to delete.

### Phase D — Deletes

Deleted exactly these IDs (each guarded by ID + topic slug; rowCount=1 each):

| Topic | Deleted ID |
|---|---|
| `scope` | `cmuocsbrb002nfcuyy671eglu` |
| `higher-order-functions` | `cmuocss0e003vfcuy6gsconaq` |
| `this-keyword` | `cmuocsww60048fcuyfdpzg7en` |
| `this-keyword` | `cmuocsxab0049fcuy0x8olix1` |
| `closures` | `cmuoct26c004mfcuykt007syw` |
| `web-apis` | `cmuoctcbs005dfcuyle0ghelg` |
| `promises` | `cmuoctiza005vfcuyirup459l` |
| `lexical-environment` | `cmuoctxbd006yfcuyp17eqmwy` |
| `classes` | `cmuocu2tn007dfcuyn66yz5h0` |

### Phase E — Final integrity

| Check | Result |
|---|---|
| Topics | 52 |
| Questions | 260 |
| Questions per topic | 5 exactly |
| Every JSON `(topicSlug, prompt)` → one DB row | Pass |
| Obsolete IDs / prompts remaining | 0 |
| Orphans / duplicate prompts | 0 / 0 |
| Content-only 7 still match JSON | Pass |
| SessionLog / Mistake | 0 / 0 (unchanged) |

Seed was **not** re-run after cleanup.

---

## 3. Checklist

- [x] Preflight / backup
- [x] `npx prisma db seed`
- [x] Verify 9 replacements + 7 content updates
- [x] Delete 9 obsolete IDs only
- [x] Final integrity vs `questions.json`
- [x] Mark Step 10 complete in tracker

### Explicitly not done (later steps)

- [ ] Step 11 — Deploy and verify authentication in production
- [ ] Step 12 — Production smoke test

---

## 4. Next action

**Phase 2 Step 11 — deploy and verify authentication in production** (then Step 12 smoke test).

Do not treat local Neon seed success as production verification.
