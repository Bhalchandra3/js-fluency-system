-- CreateEnum
CREATE TYPE "RevisionSessionStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RevisionSessionOutcome" AS ENUM ('ADVANCE', 'REINFORCE', 'REINFORCE_AT_1', 'RESET');

-- CreateTable
CREATE TABLE "RevisionSession" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" "RevisionSessionStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "outcome" "RevisionSessionOutcome",
    "previousIntervalDays" INTEGER,
    "resultingIntervalDays" INTEGER,
    "previousNextRevisionDate" TIMESTAMP(3),
    "resultingNextRevisionDate" TIMESTAMP(3),
    "policyVersion" TEXT NOT NULL DEFAULT 'phase3-g5-v1',

    CONSTRAINT "RevisionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionSessionQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "RevisionSessionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevisionSession_topicId_status_idx" ON "RevisionSession"("topicId", "status");

-- CreateIndex
CREATE INDEX "RevisionSession_startedAt_idx" ON "RevisionSession"("startedAt");

-- CreateIndex
CREATE INDEX "RevisionSessionQuestion_questionId_idx" ON "RevisionSessionQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionSessionQuestion_sessionId_questionId_key" ON "RevisionSessionQuestion"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionSessionQuestion_sessionId_sortOrder_key" ON "RevisionSessionQuestion"("sessionId", "sortOrder");

-- Partial unique: at most one OPEN revision session per topic
CREATE UNIQUE INDEX "RevisionSession_one_open_per_topic_idx"
  ON "RevisionSession" ("topicId")
  WHERE "status" = 'OPEN';

-- AddForeignKey
ALTER TABLE "RevisionSession" ADD CONSTRAINT "RevisionSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSessionQuestion" ADD CONSTRAINT "RevisionSessionQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RevisionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSessionQuestion" ADD CONSTRAINT "RevisionSessionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
-- Safe when "SessionLog" is empty (verified preflight count = 0 on configured Neon).
-- Do not apply to an environment with existing SessionLog rows without a staged nullable path.
ALTER TABLE "SessionLog" ADD COLUMN "selectedAnswer" TEXT NOT NULL,
ADD COLUMN "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SessionLog_sessionId_questionId_key" ON "SessionLog"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RevisionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
