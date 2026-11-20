-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "meetingFileId" TEXT NOT NULL,
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "text" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transcriptions_meetingFileId_key" ON "transcriptions"("meetingFileId");

-- CreateIndex
CREATE INDEX "transcriptions_meetingFileId_idx" ON "transcriptions"("meetingFileId");

-- CreateIndex
CREATE INDEX "transcriptions_status_idx" ON "transcriptions"("status");

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_meetingFileId_fkey" FOREIGN KEY ("meetingFileId") REFERENCES "meeting_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
