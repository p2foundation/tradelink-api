-- Fix for existing transactions table: Add negotiationId column
-- Run this if you get the error: "column negotiationId referenced in foreign key constraint does not exist"
-- This adds the missing column and constraints

-- Add negotiationId column to transactions table if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "negotiationId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column negotiationId already exists in transactions table';
END $$;

-- Add unique constraint on negotiationId (only for non-null values)
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "transactions_negotiationId_key" 
        ON "transactions"("negotiationId") WHERE "negotiationId" IS NOT NULL;
EXCEPTION
    WHEN duplicate_table THEN 
        RAISE NOTICE 'Unique index on negotiationId already exists';
END $$;

-- Add foreign key constraint
DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_negotiationId_fkey" 
        FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Foreign key constraint transactions_negotiationId_fkey already exists';
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "transactions_negotiationId_idx" ON "transactions"("negotiationId");

SELECT '✅ Fixed: negotiationId column added to transactions table' AS result;

