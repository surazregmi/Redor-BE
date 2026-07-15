-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createdById" BIGINT;

-- CreateIndex
CREATE INDEX "users_createdById_idx" ON "users"("createdById");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
