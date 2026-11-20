-- CreateEnum
CREATE TYPE "AiProcessingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "aiError" TEXT,
ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiStatus" "AiProcessingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "decisions" TEXT[],
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "assignee" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "sourceMeetingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_sourceMeetingId_idx" ON "tasks"("sourceMeetingId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_sourceMeetingId_titleKey_key" ON "tasks"("sourceMeetingId", "titleKey");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sourceMeetingId_fkey" FOREIGN KEY ("sourceMeetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
