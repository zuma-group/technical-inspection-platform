-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Equipment_taskId_idx" ON "Equipment"("taskId");
