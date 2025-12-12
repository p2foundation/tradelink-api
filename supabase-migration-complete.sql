-- TradeLink+ Complete Database Migration for Supabase
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This includes all tables: Users, Farmers, Buyers, Listings, Matches, Transactions, Negotiations, Offers, Payments

-- Enable PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Set default timezone
SET timezone = 'Africa/Accra';

-- ============================================
-- CREATE ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('FARMER', 'BUYER', 'EXPORT_COMPANY', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PENDING', 'SOLD', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QualityGrade" AS ENUM ('PREMIUM', 'GRADE_A', 'GRADE_B', 'STANDARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'CONTACTED', 'NEGOTIATING', 'CONTRACT_SIGNED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NegotiationStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('VISA', 'MASTERCARD', 'MOBILE_MONEY', 'PAPSS', 'BANK_TRANSFER', 'MANUAL_PORT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Farmers Table
CREATE TABLE IF NOT EXISTS "Farmer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "location" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "gpsAddress" TEXT,
    "farmSize" DOUBLE PRECISION,
    "cooperativeId" TEXT,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bankAccount" TEXT,
    "mobileMoneyNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Farmer_userId_key" ON "Farmer"("userId");

-- Buyers Table (Note: Prisma model "Buyer" maps to table "buyers")
CREATE TABLE IF NOT EXISTS "buyers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryName" TEXT,
    "industry" TEXT NOT NULL,
    "website" TEXT,
    "companySize" TEXT,
    "seekingCrops" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "volumeRequired" TEXT,
    "qualityStandards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredCurrency" TEXT DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "buyers_userId_key" ON "buyers"("userId");

-- Export Companies Table
CREATE TABLE IF NOT EXISTS "ExportCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "gepaLicense" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportCompany_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExportCompany_userId_key" ON "ExportCompany"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExportCompany_registrationNo_key" ON "ExportCompany"("registrationNo");

-- Listings Table
CREATE TABLE IF NOT EXISTS "Listing" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "cropVariety" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'tons',
    "qualityGrade" "QualityGrade" NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "harvestDate" TIMESTAMP(3),
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableUntil" TIMESTAMP(3),
    "description" TEXT,
    "images" TEXT[],
    "certifications" TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- Matches Table
CREATE TABLE IF NOT EXISTS "Match" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "compatibilityScore" DOUBLE PRECISION NOT NULL,
    "estimatedValue" DOUBLE PRECISION NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "aiRecommendation" TEXT,
    "contactedAt" TIMESTAMP(3),
    "negotiationStartedAt" TIMESTAMP(3),
    "contractSignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "negotiationId" TEXT,
    "buyerId" TEXT NOT NULL,
    "exportCompanyId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "agreedPrice" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "contractDocument" TEXT,
    "invoiceDocument" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "shipmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentDate" TIMESTAMP(3),
    "shipmentDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "gcmsReferenceNo" TEXT,
    "exchangeRate" DOUBLE PRECISION,
    "localCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- Negotiations Table
CREATE TABLE IF NOT EXISTS "negotiations" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'ACTIVE',
    "initialPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "terms" TEXT,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "lastUpdatedBy" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,

    CONSTRAINT "negotiations_pkey" PRIMARY KEY ("id")
);

-- Offers Table
CREATE TABLE IF NOT EXISTS "offers" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "offeredBy" TEXT NOT NULL,
    "offeredByRole" "UserRole" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "message" TEXT,
    "terms" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "responseMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- Payments Table
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerTransactionId" TEXT,
    "providerResponse" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "receiptDocument" TEXT,
    "receiptNumber" TEXT,
    "receiptDate" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_transactionId_key" UNIQUE ("transactionId")
);

-- Analytics Table
CREATE TABLE IF NOT EXISTS "Analytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalFarmers" INTEGER NOT NULL DEFAULT 0,
    "totalBuyers" INTEGER NOT NULL DEFAULT 0,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "activeMatches" INTEGER NOT NULL DEFAULT 0,
    "dailyTradeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPriceImprovement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Analytics_date_key" ON "Analytics"("date");

-- ============================================
-- ADD FOREIGN KEYS
-- ============================================

-- Farmer relations
DO $$ BEGIN
    ALTER TABLE "Farmer" ADD CONSTRAINT "Farmer_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Buyer relations
DO $$ BEGIN
    ALTER TABLE "buyers" ADD CONSTRAINT "buyers_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Export Company relations
DO $$ BEGIN
    ALTER TABLE "ExportCompany" ADD CONSTRAINT "ExportCompany_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Listing relations
DO $$ BEGIN
    ALTER TABLE "Listing" ADD CONSTRAINT "Listing_farmerId_fkey" 
        FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Match relations
DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_listingId_fkey" 
        FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_farmerId_fkey" 
        FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_buyerId_fkey" 
        FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transaction relations
DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_matchId_fkey" 
        FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" 
        FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_exportCompanyId_fkey" 
        FOREIGN KEY ("exportCompanyId") REFERENCES "ExportCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Negotiation relations
DO $$ BEGIN
    ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_matchId_fkey" 
        FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_transactionId_fkey" 
        FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transaction-Negotiation relation
-- First, add negotiationId column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "negotiationId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add unique constraint on negotiationId (only for non-null values)
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "transactions_negotiationId_key" 
        ON "transactions"("negotiationId") WHERE "negotiationId" IS NOT NULL;
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Now add the foreign key constraint
DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_negotiationId_fkey" 
        FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Offer relations
DO $$ BEGIN
    ALTER TABLE "offers" ADD CONSTRAINT "offers_negotiationId_fkey" 
        FOREIGN KEY ("negotiationId") REFERENCES "negotiations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment relations
DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_transactionId_fkey" 
        FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- Listing indexes
CREATE INDEX IF NOT EXISTS "Listing_farmerId_idx" ON "Listing"("farmerId");
CREATE INDEX IF NOT EXISTS "Listing_status_idx" ON "Listing"("status");
CREATE INDEX IF NOT EXISTS "Listing_cropType_idx" ON "Listing"("cropType");

-- Match indexes
CREATE INDEX IF NOT EXISTS "Match_listingId_idx" ON "Match"("listingId");
CREATE INDEX IF NOT EXISTS "Match_farmerId_buyerId_idx" ON "Match"("farmerId", "buyerId");
CREATE INDEX IF NOT EXISTS "Match_status_idx" ON "Match"("status");

-- Transaction indexes
CREATE INDEX IF NOT EXISTS "transactions_paymentStatus_shipmentStatus_idx" ON "transactions"("paymentStatus", "shipmentStatus");
CREATE INDEX IF NOT EXISTS "transactions_buyerId_idx" ON "transactions"("buyerId");
CREATE INDEX IF NOT EXISTS "transactions_currency_idx" ON "transactions"("currency");
CREATE INDEX IF NOT EXISTS "transactions_createdAt_idx" ON "transactions"("createdAt");
CREATE INDEX IF NOT EXISTS "transactions_negotiationId_idx" ON "transactions"("negotiationId");

-- Negotiation indexes
CREATE INDEX IF NOT EXISTS "negotiations_matchId_idx" ON "negotiations"("matchId");
CREATE INDEX IF NOT EXISTS "negotiations_status_idx" ON "negotiations"("status");
CREATE INDEX IF NOT EXISTS "negotiations_createdAt_idx" ON "negotiations"("createdAt");

-- Offer indexes
CREATE INDEX IF NOT EXISTS "offers_negotiationId_idx" ON "offers"("negotiationId");
CREATE INDEX IF NOT EXISTS "offers_offeredBy_idx" ON "offers"("offeredBy");
CREATE INDEX IF NOT EXISTS "offers_status_idx" ON "offers"("status");
CREATE INDEX IF NOT EXISTS "offers_createdAt_idx" ON "offers"("createdAt");

-- Payment indexes
CREATE INDEX IF NOT EXISTS "payments_transactionId_idx" ON "payments"("transactionId");
CREATE INDEX IF NOT EXISTS "payments_paymentStatus_idx" ON "payments"("paymentStatus");
CREATE INDEX IF NOT EXISTS "payments_paymentMethod_idx" ON "payments"("paymentMethod");
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");

-- Analytics indexes
CREATE INDEX IF NOT EXISTS "Analytics_date_idx" ON "Analytics"("date");

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ Migration completed successfully! All tables created: users, Farmer, buyers, ExportCompany, Listing, Match, transactions, negotiations, offers, payments, Analytics' AS result;

