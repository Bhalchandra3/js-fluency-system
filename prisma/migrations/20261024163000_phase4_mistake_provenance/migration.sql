-- AlterTable
ALTER TABLE "Mistake" ADD COLUMN     "questionId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "sourceSessionLogId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Mistake_sourceSessionLogId_key" ON "Mistake"("sourceSessionLogId");

-- CreateIndex
CREATE INDEX "Mistake_topicId_resolvedAt_idx" ON "Mistake"("topicId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RevisionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_sourceSessionLogId_fkey" FOREIGN KEY ("sourceSessionLogId") REFERENCES "SessionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
