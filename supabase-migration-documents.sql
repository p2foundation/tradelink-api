-- TradeLink+ Documents Migration
-- Run this in Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run
-- This migration adds the Document model for trade document management

-- Create DocumentType enum
DO $$ 
BEGIN
    CREATE TYPE "DocumentType" AS ENUM (
        'EXPORT_LICENSE',
        'IMPORT_PERMIT',
        'CERTIFICATE_OF_ORIGIN',
        'PHYTOSANITARY_CERTIFICATE',
        'QUALITY_CERTIFICATE',
        'ORGANIC_CERTIFICATION',
        'FAIR_TRADE_CERTIFICATION',
        'COMMERCIAL_INVOICE',
        'PACKING_LIST',
        'BILL_OF_LADING',
        'INSURANCE_CERTIFICATE',
        'TRADE_CONTRACT',
        'GEPA_LICENSE',
        'CUSTOMS_DECLARATION',
        'HEALTH_CERTIFICATE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create DocumentStatus enum
DO $$ 
BEGIN
    CREATE TYPE "DocumentStatus" AS ENUM (
        'PENDING',
        'VERIFIED',
        'REJECTED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create documents table
CREATE TABLE IF NOT EXISTS "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    
    -- Document information
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "description" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    
    -- Reference information
    "referenceNumber" TEXT,
    "issuedBy" TEXT,
    
    -- Verification information
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key to User if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'documents_userId_fkey'
    ) THEN
        ALTER TABLE "documents"
        ADD CONSTRAINT "documents_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;

    -- Add foreign key to Transaction if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'documents_transactionId_fkey'
    ) THEN
        ALTER TABLE "documents"
        ADD CONSTRAINT "documents_transactionId_fkey" 
        FOREIGN KEY ("transactionId") 
        REFERENCES "transactions"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "documents_userId_idx" 
ON "documents"("userId");

CREATE INDEX IF NOT EXISTS "documents_type_idx" 
ON "documents"("type");

CREATE INDEX IF NOT EXISTS "documents_status_idx" 
ON "documents"("status");

CREATE INDEX IF NOT EXISTS "documents_transactionId_idx" 
ON "documents"("transactionId");

CREATE INDEX IF NOT EXISTS "documents_expiryDate_idx" 
ON "documents"("expiryDate");

-- Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updatedAt
DROP TRIGGER IF EXISTS documents_updated_at ON "documents";
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON "documents"
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE "documents" IS 'Tracks trade documents (certificates, licenses, invoices, etc.) uploaded by users';
COMMENT ON COLUMN "documents"."type" IS 'Type of document (export license, certificate, invoice, etc.)';
COMMENT ON COLUMN "documents"."status" IS 'Document verification status: PENDING, VERIFIED, REJECTED, EXPIRED';
COMMENT ON COLUMN "documents"."fileUrl" IS 'Base64 encoded file or URL to stored document';
COMMENT ON COLUMN "documents"."referenceNumber" IS 'Document reference number (license number, certificate number, etc.)';
COMMENT ON COLUMN "documents"."issuedBy" IS 'Issuing authority (GEPA, GRA, etc.)';
COMMENT ON COLUMN "documents"."verifiedBy" IS 'User ID of admin who verified the document';

-- Verify the table was created successfully
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
        RAISE NOTICE 'Table documents created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create documents table';
    END IF;
END $$;
