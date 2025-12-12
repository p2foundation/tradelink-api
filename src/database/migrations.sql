-- PostgreSQL Extensions for International Standards
-- Run these after initial migration

-- Enable trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable GIN indexes for array searches
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Enable GiST indexes for range queries
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Set default timezone
SET timezone = 'Africa/Accra';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_farmers_location_trgm ON farmers USING gin (location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_buyers_company_trgm ON buyers USING gin (company_name gin_trgm_ops);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with internationalization support';
COMMENT ON TABLE farmers IS 'Farmer profiles with geographic indexing';
COMMENT ON TABLE buyers IS 'International buyers with country code standards';
COMMENT ON TABLE transactions IS 'Transactions with multi-currency support';

COMMENT ON COLUMN users.locale IS 'ISO 639-1 language code (en, tw, ewe, ha)';
COMMENT ON COLUMN users.timezone IS 'IANA timezone identifier (e.g., Africa/Accra)';
COMMENT ON COLUMN users.currency IS 'ISO 4217 currency code (e.g., USD, GHS)';
COMMENT ON COLUMN buyers.country IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN transactions.currency IS 'ISO 4217 currency code';
COMMENT ON COLUMN transactions.exchange_rate IS 'Exchange rate at time of transaction';

