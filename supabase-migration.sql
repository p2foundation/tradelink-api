-- TradeLink+ Database Migration
-- Run this in Supabase SQL Editor (uses direct connection, not pooler)
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Enable PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Set default timezone
SET timezone = 'Africa/Accra';

-- Create Enums
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

-- Create Users Table
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

-- Create Farmers Table
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

-- Create Buyers Table
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

-- Create ExportCompany Table
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

-- Create Listings Table
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
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- Create Matches Table
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

-- Create Transactions Table
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
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

-- Create Analytics Table
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

-- Create Foreign Keys
DO $$ BEGIN
    ALTER TABLE "Farmer" ADD CONSTRAINT "Farmer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "buyers" ADD CONSTRAINT "buyers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ExportCompany" ADD CONSTRAINT "ExportCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Listing" ADD CONSTRAINT "Listing_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_exportCompanyId_fkey" FOREIGN KEY ("exportCompanyId") REFERENCES "ExportCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Unique Constraints
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "Farmer_userId_key" ON "Farmer"("userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "buyers_userId_key" ON "buyers"("userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "ExportCompany_userId_key" ON "ExportCompany"("userId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "ExportCompany_registrationNo_key" ON "ExportCompany"("registrationNo");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "Analytics_date_key" ON "Analytics"("date");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_locale_idx" ON "users"("locale");
CREATE INDEX IF NOT EXISTS "Farmer_region_district_idx" ON "Farmer"("region", "district");
CREATE INDEX IF NOT EXISTS "buyers_country_idx" ON "buyers"("country");
CREATE INDEX IF NOT EXISTS "buyers_industry_idx" ON "buyers"("industry");
CREATE INDEX IF NOT EXISTS "Listing_cropType_status_idx" ON "Listing"("cropType", "status");
CREATE INDEX IF NOT EXISTS "Listing_availableFrom_availableUntil_idx" ON "Listing"("availableFrom", "availableUntil");
CREATE INDEX IF NOT EXISTS "Listing_farmerId_idx" ON "Listing"("farmerId");
CREATE INDEX IF NOT EXISTS "Match_status_idx" ON "Match"("status");
CREATE INDEX IF NOT EXISTS "Match_createdAt_idx" ON "Match"("createdAt");
CREATE INDEX IF NOT EXISTS "Match_farmerId_buyerId_idx" ON "Match"("farmerId", "buyerId");
CREATE INDEX IF NOT EXISTS "transactions_paymentStatus_shipmentStatus_idx" ON "transactions"("paymentStatus", "shipmentStatus");
CREATE INDEX IF NOT EXISTS "transactions_buyerId_idx" ON "transactions"("buyerId");
CREATE INDEX IF NOT EXISTS "transactions_currency_idx" ON "transactions"("currency");
CREATE INDEX IF NOT EXISTS "transactions_createdAt_idx" ON "transactions"("createdAt");
CREATE INDEX IF NOT EXISTS "Analytics_date_idx" ON "Analytics"("date");

-- Create Trigram Indexes for Full-Text Search
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Farmer_location_trgm_idx" ON "Farmer" USING gin ("location" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "buyers_companyName_trgm_idx" ON "buyers" USING gin ("companyName" gin_trgm_ops);

-- Add Comments
COMMENT ON TABLE "users" IS 'User accounts with internationalization support';
COMMENT ON TABLE "Farmer" IS 'Farmer profiles with geographic indexing';
COMMENT ON TABLE "buyers" IS 'International buyers with country code standards';
COMMENT ON TABLE "transactions" IS 'Transactions with multi-currency support';
COMMENT ON COLUMN "users"."locale" IS 'ISO 639-1 language code (en, tw, ewe, ha)';
COMMENT ON COLUMN "users"."timezone" IS 'IANA timezone identifier (e.g., Africa/Accra)';
COMMENT ON COLUMN "users"."currency" IS 'ISO 4217 currency code (e.g., USD, GHS)';
COMMENT ON COLUMN "buyers"."country" IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN "transactions"."currency" IS 'ISO 4217 currency code';
COMMENT ON COLUMN "transactions"."exchangeRate" IS 'Exchange rate at time of transaction';

-- Success message
DO $$ BEGIN
    RAISE NOTICE '✅ TradeLink+ database schema created successfully!';
    RAISE NOTICE '📊 Tables created: users, Farmer, buyers, ExportCompany, Listing, Match, transactions, Analytics';
    RAISE NOTICE '🔍 Indexes and extensions enabled for optimal performance';
END $$;

