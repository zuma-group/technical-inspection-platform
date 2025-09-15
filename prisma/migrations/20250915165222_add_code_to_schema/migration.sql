/*
  Warnings:

  - You are about to drop the column `code` on the `Checkpoint` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `TemplateCheckpoint` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `TemplateSection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Checkpoint" DROP COLUMN "code";

-- AlterTable
ALTER TABLE "TemplateCheckpoint" DROP COLUMN "code";

-- AlterTable
ALTER TABLE "TemplateSection" DROP COLUMN "code";
