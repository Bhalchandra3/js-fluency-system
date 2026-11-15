# Disaster Recovery & Backup Runbook

This document details the recovery procedures for the **JavaScript Fluency System** to ensure no learning history is permanently lost.

---

## 1. Backup Strategies Overview

| Method | Target | Retention | Use Case |
|---|---|---|---|
| **Neon Point-In-Time Recovery (PITR)** | Cloud Neon Database | 24 Hours (Free Tier) | Fast operational recovery after a bad migration or accidental deletion. |
| **Local Snapshot Tool (`npm run db:backup`)** | Local JSON in `backups/` | Indefinite | Durable offsite backup taken before major deployments or periodically. |

---

## 2. Procedure A: Point-In-Time Recovery via Neon Console (Within 24 Hours)

If an issue occurs (e.g. an unintended database reset or accidental deletion) and is caught within 24 hours:

1. Open the **[Neon Console](https://console.neon.tech)** and navigate to the project.
2. Go to **Branches** -> click **New Branch**.
3. Choose the parent branch (`main`).
4. Select **"Time in the past"** (Point-in-time restore).
5. Choose a timestamp prior to the incident (e.g., 10 minutes before the faulty operation).
6. Name the recovery branch: `recovery-YYYY-MM-DD`.
7. Once created, update the Vercel production environment variable `DATABASE_URL` to point to the new recovery branch's pooled connection string.
8. Redeploy or restart the Vercel deployment.

---

## 3. Procedure B: Taking a Local Snapshot (`npm run db:backup`)

Run the automated backup script before performing any database migration or schema modification:

```bash
npm run db:backup
```

### What this does:
- Queries all 7 core models: `Topic`, `Question`, `SessionLog`, `RevisionSession`, `RevisionSessionQuestion`, `Mistake`, `DeepDiveNote`.
- Writes a formatted, timestamped JSON archive into the gitignored `backups/` directory:
  ```text
  backups/backup-2026-11-13T17-30-00-000Z.json
  ```
- Displays an ASCII table of record counts for immediate verification.

---

## 4. Procedure C: Disaster Recovery from JSON Snapshot

If a fresh database instance needs to be restored from a JSON snapshot:

1. Create a fresh Neon branch or local database.
2. Run database migrations to construct the clean schema:
   ```bash
   npx prisma migrate deploy
   ```
3. Use a restore script or Node script to insert rows in foreign-key dependency order:
   - `Topic`
   - `Question`
   - `RevisionSession`
   - `RevisionSessionQuestion`
   - `SessionLog`
   - `Mistake`
   - `DeepDiveNote`
4. Verify record counts match the `metadata.counts` block in the JSON backup file.
