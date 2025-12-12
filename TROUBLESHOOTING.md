# Database Connection Troubleshooting

## Current Issue: Can't Reach Database Server (P1001)

The connection string is correct, but the database server is unreachable. This is typically a network/firewall issue.

### Connection String Status ✅
- Username: `postgres.ebnkxrtosayvwadjtqcf` ✓
- Host: `db.ebnkxrtosayvwadjtqcf.supabase.co` ✓
- Port: `5432` ✓
- SSL: `sslmode=require` ✓
- Schema: `schema=public` ✓

### Possible Causes & Solutions

#### 1. **Firewall Blocking Port 5432**
- **Check**: Windows Firewall or corporate firewall may be blocking outbound connections to port 5432
- **Solution**: 
  - Add an exception for port 5432 in Windows Firewall
  - Contact IT if on a corporate network
  - Try using a VPN or different network

#### 2. **Supabase Project Paused**
- **Check**: Go to Supabase Dashboard → Project Settings
- **Solution**: Unpause the project if it's paused (free tier projects pause after inactivity)

#### 3. **Network/ISP Restrictions**
- **Check**: Some ISPs block database ports
- **Solution**: 
  - Try using a VPN
  - Try from a different network (mobile hotspot, etc.)
  - Contact your ISP

#### 4. **IPv6 Requirement**
- **Check**: Some Supabase connections require IPv6
- **Solution**: Ensure your network supports IPv6

#### 5. **Alternative: Use Supabase Connection Pooling**
If direct connection doesn't work, try the Transaction Pooler instead:

```
DATABASE_URL="postgresql://postgres.ebnkxrtosayvwadjtqcf:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?schema=public&sslmode=require&pgbouncer=true"
```

Note: Transaction Pooler uses port **6543** instead of 5432.

#### 6. **Test Connection from Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Try running a simple query: `SELECT 1;`
3. If this works, the issue is with your local network, not Supabase

#### 7. **Use Supabase REST API (Temporary Workaround)**
While fixing the database connection, you can use Supabase's REST API for basic operations.

### Next Steps

1. **Test Network Connectivity**:
   ```powershell
   Test-NetConnection -ComputerName db.ebnkxrtosayvwadjtqcf.supabase.co -Port 5432
   ```

2. **Check Supabase Project Status**:
   - Go to https://supabase.com/dashboard
   - Verify project is active (not paused)

3. **Try Transaction Pooler** (port 6543):
   Update `.env` with:
   ```
   DATABASE_URL="postgresql://postgres.ebnkxrtosayvwadjtqcf:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?schema=public&sslmode=require&pgbouncer=true"
   ```

4. **Contact Support**:
   - If none of the above works, contact Supabase support
   - Provide your project reference: `ebnkxrtosayvwadjtqcf`

### Verification Commands

```bash
# Test connection
node test-connection.js

# Check environment variable
type .env | findstr DATABASE_URL

# Test network connectivity
Test-NetConnection -ComputerName db.ebnkxrtosayvwadjtqcf.supabase.co -Port 5432
```

