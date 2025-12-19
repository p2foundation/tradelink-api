-- Migration: Add Buyer Verification and International Buyer Fields
-- Description: Adds fields for international buyer onboarding, compliance tracking, and Ghana Single Window verification
-- Date: December 2024

-- Add new columns to buyers table
ALTER TABLE "buyers"
ADD COLUMN IF NOT EXISTS "importLicenseNumber" TEXT,
ADD COLUMN IF NOT EXISTS "businessRegistration" TEXT,
ADD COLUMN IF NOT EXISTS "taxIdNumber" TEXT,
ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS "timezone" TEXT,
ADD COLUMN IF NOT EXISTS "complianceStatus" TEXT,
ADD COLUMN IF NOT EXISTS "complianceDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "lastComplianceCheck" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "targetMarkets" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "importRequirements" JSONB,
ADD COLUMN IF NOT EXISTS "verifiedByGhanaSW" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "ghanaSWReference" TEXT,
ADD COLUMN IF NOT EXISTS "verificationDate" TIMESTAMP(3);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "buyers_complianceStatus_idx" ON "buyers"("complianceStatus");
CREATE INDEX IF NOT EXISTS "buyers_verifiedByGhanaSW_idx" ON "buyers"("verifiedByGhanaSW");

-- Add comments for documentation
COMMENT ON COLUMN "buyers"."importLicenseNumber" IS 'Import license number for international buyers';
COMMENT ON COLUMN "buyers"."businessRegistration" IS 'Business registration number';
COMMENT ON COLUMN "buyers"."taxIdNumber" IS 'Tax identification number';
COMMENT ON COLUMN "buyers"."preferredLanguage" IS 'Preferred language code (ISO 639-1)';
COMMENT ON COLUMN "buyers"."timezone" IS 'IANA timezone identifier';
COMMENT ON COLUMN "buyers"."complianceStatus" IS 'Compliance status: PENDING, VERIFIED, REJECTED';
COMMENT ON COLUMN "buyers"."complianceDocuments" IS 'Array of document IDs for compliance documents';
COMMENT ON COLUMN "buyers"."lastComplianceCheck" IS 'Last compliance check timestamp';
COMMENT ON COLUMN "buyers"."targetMarkets" IS 'Array of target markets (e.g., ["USA", "EU", "China"])';
COMMENT ON COLUMN "buyers"."importRequirements" IS 'Country-specific import requirements stored as JSON';
COMMENT ON COLUMN "buyers"."verifiedByGhanaSW" IS 'Whether buyer is verified by Ghana Single Window';
COMMENT ON COLUMN "buyers"."ghanaSWReference" IS 'Reference number from Ghana Single Window';
COMMENT ON COLUMN "buyers"."verificationDate" IS 'Date when verification was completed';

-- Update existing buyers to have default values
UPDATE "buyers"
SET 
  "preferredLanguage" = COALESCE("preferredLanguage", 'en'),
  "complianceDocuments" = COALESCE("complianceDocuments", ARRAY[]::TEXT[]),
  "targetMarkets" = COALESCE("targetMarkets", ARRAY[]::TEXT[]),
  "verifiedByGhanaSW" = COALESCE("verifiedByGhanaSW", false)
WHERE 
  "preferredLanguage" IS NULL 
  OR "complianceDocuments" IS NULL 
  OR "targetMarkets" IS NULL 
  OR "verifiedByGhanaSW" IS NULL;

-- Verify the migration
DO $$
BEGIN
  -- Check if all columns were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'buyers' AND column_name = 'importLicenseNumber'
  ) THEN
    RAISE EXCEPTION 'Column importLicenseNumber was not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'buyers' AND column_name = 'verifiedByGhanaSW'
  ) THEN
    RAISE EXCEPTION 'Column verifiedByGhanaSW was not added';
  END IF;

  RAISE NOTICE 'Migration completed successfully! All columns added to buyers table.';
END $$;
