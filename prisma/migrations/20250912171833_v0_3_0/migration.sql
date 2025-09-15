-- AlterEnum
ALTER TYPE "CheckpointStatus" ADD VALUE 'NOT_APPLICABLE';

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Inspection_taskId_idx" ON "Inspection"("taskId");
