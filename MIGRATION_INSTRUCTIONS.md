# Database Migration Instructions

## ⚠️ Important: Transaction Pooler Limitation

The **Transaction Pooler** (port 6543) that we're using for connections **does NOT support DDL operations** like:
- Creating tables
- Creating indexes
- Creating extensions
- Running migrations

## ✅ Solution: Run Migration in Supabase SQL Editor

Since the Transaction Pooler doesn't support DDL, you need to run the migration SQL directly in Supabase's SQL Editor, which uses the direct connection.

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New query"**

2. **Copy and Run the Migration**
   - Open the file: `api/supabase-migration.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **"Run"** (or press `Ctrl+Enter`)

3. **Verify Migration**
   - Check that all tables are created
   - You should see a success message at the end

4. **After Migration**
   - Your Prisma client is already generated
   - You can now use the Transaction Pooler for regular queries
   - The API will work normally with the pooler connection

## 🔄 Alternative: Use Direct Connection Temporarily

If you can temporarily allow the direct connection (port 5432) through your firewall:

1. Update `.env` to use Direct Connection:
   ```
   DATABASE_URL="postgresql://postgres.ebnkxrtosayvwadjtqcf:[PASSWORD]@db.ebnkxrtosayvwadjtqcf.supabase.co:5432/postgres?schema=public&sslmode=require"
   ```

2. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Switch back to Transaction Pooler:
   ```
   DATABASE_URL="postgresql://postgres.ebnkxrtosayvwadjtqcf:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?schema=public&sslmode=require&pgbouncer=true"
   ```

## 📝 What the Migration Creates

- ✅ All database tables (users, farmers, buyers, listings, matches, transactions, analytics)
- ✅ All indexes for performance
- ✅ PostgreSQL extensions (pg_trgm, btree_gin, btree_gist)
- ✅ Foreign key relationships
- ✅ Unique constraints
- ✅ Default values and enums

## 🚀 After Migration

Once the migration is complete:

1. **Test the connection:**
   ```bash
   npm run dev
   ```

2. **Seed the database (optional):**
   ```bash
   npx prisma db seed
   ```

3. **Verify in Supabase:**
   - Go to Table Editor in Supabase Dashboard
   - You should see all the tables listed

## ❓ Troubleshooting

**If you get errors:**
- Make sure you're running the SQL in Supabase SQL Editor (not through Prisma)
- Check that your Supabase project is active (not paused)
- Verify you have the correct permissions

**If tables already exist:**
- The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
- It will skip existing objects

