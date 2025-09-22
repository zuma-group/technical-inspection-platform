-- Add S3-related fields to Media and make data optional

-- Make sure table exists before altering (PostgreSQL)
-- Add columns if they don't already exist (idempotent-ish pattern)
DO $$
BEGIN
  -- storage column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Media' AND column_name = 'storage'
  ) THEN
    ALTER TABLE "Media" ADD COLUMN "storage" TEXT NOT NULL DEFAULT 'DB';
  END IF;

  -- url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Media' AND column_name = 'url'
  ) THEN
    ALTER TABLE "Media" ADD COLUMN "url" TEXT;
  END IF;

  -- s3Key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Media' AND column_name = 's3Key'
  ) THEN
    ALTER TABLE "Media" ADD COLUMN "s3Key" TEXT;
  END IF;

  -- make data nullable (drop NOT NULL)
  PERFORM 1 FROM information_schema.columns 
    WHERE table_name = 'Media' AND column_name = 'data' AND is_nullable = 'NO';
  IF FOUND THEN
    ALTER TABLE "Media" ALTER COLUMN "data" DROP NOT NULL;
  END IF;
END $$;


