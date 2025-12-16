-- TradeLink+ Supplier Networks Migration
-- Run this in Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run
-- This migration adds the SupplierNetwork model to track ExportCompany-Farmer relationships

-- Create supplier_networks table
CREATE TABLE IF NOT EXISTS "supplier_networks" (
    "id" TEXT NOT NULL,
    "exportCompanyId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    
    -- Relationship metadata
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "relationshipType" TEXT,
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "notes" TEXT,
    
    -- Performance metrics
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION,
    "reliabilityScore" DOUBLE PRECISION,
    "lastDealDate" TIMESTAMP(3),
    
    -- Added by export company
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_networks_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key to ExportCompany if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'supplier_networks_exportCompanyId_fkey'
    ) THEN
        ALTER TABLE "supplier_networks"
        ADD CONSTRAINT "supplier_networks_exportCompanyId_fkey" 
        FOREIGN KEY ("exportCompanyId") 
        REFERENCES "ExportCompany"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;

    -- Add foreign key to Farmer if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'supplier_networks_farmerId_fkey'
    ) THEN
        ALTER TABLE "supplier_networks"
        ADD CONSTRAINT "supplier_networks_farmerId_fkey" 
        FOREIGN KEY ("farmerId") 
        REFERENCES "Farmer"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Create unique constraint for exportCompanyId + farmerId combination
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'supplier_networks_exportCompanyId_farmerId_key'
    ) THEN
        ALTER TABLE "supplier_networks"
        ADD CONSTRAINT "supplier_networks_exportCompanyId_farmerId_key" 
        UNIQUE ("exportCompanyId", "farmerId");
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "supplier_networks_exportCompanyId_idx" 
ON "supplier_networks"("exportCompanyId");

CREATE INDEX IF NOT EXISTS "supplier_networks_farmerId_idx" 
ON "supplier_networks"("farmerId");

CREATE INDEX IF NOT EXISTS "supplier_networks_status_idx" 
ON "supplier_networks"("status");

-- Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_supplier_networks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS supplier_networks_updated_at ON "supplier_networks";
CREATE TRIGGER supplier_networks_updated_at
    BEFORE UPDATE ON "supplier_networks"
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_networks_updated_at();

-- Add comments for documentation
COMMENT ON TABLE "supplier_networks" IS 'Tracks relationships between Export Companies and Farmers in their supplier network';
COMMENT ON COLUMN "supplier_networks"."status" IS 'Relationship status: ACTIVE, INACTIVE, PENDING, SUSPENDED';
COMMENT ON COLUMN "supplier_networks"."relationshipType" IS 'Type of relationship: DIRECT, COOPERATIVE, CONTRACT, PARTNERSHIP';
COMMENT ON COLUMN "supplier_networks"."totalDeals" IS 'Total number of transactions/deals with this supplier';
COMMENT ON COLUMN "supplier_networks"."totalValue" IS 'Total value of all transactions with this supplier';
COMMENT ON COLUMN "supplier_networks"."qualityScore" IS 'Quality score (0-100) based on transaction history';
COMMENT ON COLUMN "supplier_networks"."reliabilityScore" IS 'Reliability score (0-100) based on transaction history';

-- Verify the table was created successfully
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_networks') THEN
        RAISE NOTICE 'Table supplier_networks created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create supplier_networks table';
    END IF;
END $$;

