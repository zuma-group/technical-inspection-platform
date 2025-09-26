-- Add freight support fields

-- AlterTable: Inspection -> add freightId
ALTER TABLE "Inspection" ADD COLUMN "freightId" TEXT;

-- AlterTable: InspectionTemplate -> add requiresFreightId with default false
ALTER TABLE "InspectionTemplate" ADD COLUMN "requiresFreightId" BOOLEAN NOT NULL DEFAULT FALSE;


