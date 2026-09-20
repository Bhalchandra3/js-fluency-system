-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('EASY', 'OKAY', 'DIFFICULT', 'DIDNT_UNDERSTAND');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('REVISION', 'PRACTICE');

-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'OUTPUT_PREDICTION', 'CODE_WRITING', 'DEBUGGING');

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'JavaScript',
    "category" TEXT NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'RED',
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "nextRevisionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "format" "QuestionFormat" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "correct" BOOLEAN,
    "confidence" "ConfidenceLevel" NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "mistakeText" TEXT NOT NULL,
    "correctUnderstanding" TEXT NOT NULL,
    "turnedIntoQuestion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepDiveNote" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeepDiveNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProgress" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "questionsPlanned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Topic_nextRevisionDate_idx" ON "Topic"("nextRevisionDate");

-- CreateIndex
CREATE INDEX "Topic_status_idx" ON "Topic"("status");

-- CreateIndex
CREATE INDEX "Question_topicId_sessionType_idx" ON "Question"("topicId", "sessionType");

-- CreateIndex
CREATE INDEX "SessionLog_topicId_answeredAt_idx" ON "SessionLog"("topicId", "answeredAt");

-- CreateIndex
CREATE INDEX "SessionLog_answeredAt_idx" ON "SessionLog"("answeredAt");

-- CreateIndex
CREATE INDEX "Mistake_topicId_idx" ON "Mistake"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "DeepDiveNote_topicId_key" ON "DeepDiveNote"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProgress_date_key" ON "DailyProgress"("date");

-- CreateIndex
CREATE INDEX "DailyProgress_date_idx" ON "DailyProgress"("date");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepDiveNote" ADD CONSTRAINT "DeepDiveNote_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
