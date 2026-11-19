-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarFile" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_avatarFile_key" ON "users"("avatarFile");
