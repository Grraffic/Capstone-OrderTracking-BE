# Database Connection Troubleshooting Guide

## Current Issue: CONNECT_TIMEOUT Error

You're experiencing a `CONNECT_TIMEOUT` error when trying to connect to your Supabase PostgreSQL database.

```
Error: write CONNECT_TIMEOUT undefined:undefined
Code: CONNECT_TIMEOUT
```

## Quick Fixes to Try

### Fix 1: Use Direct Connection Instead of Pooler (RECOMMENDED)

Your current connection string uses the **pooler** (port 6543):
```
postgresql://postgres.htmghjogrouslqmpimht:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Try using the **direct connection** (port 5432) instead:

1. **Open your `.env` file** in `CAPSTONE/backend/.env`

2. **Replace the DATABASE_URL with the direct connection:**

```env
# OLD (Pooler - port 6543)
# DATABASE_URL=postgresql://postgres.htmghjogrouslqmpimht:09651221953Gr@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=no-verify

# NEW (Direct - port 5432) - TRY THIS FIRST
DATABASE_URL=postgresql://postgres.htmghjogrouslqmpimht:09651221953Gr@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

3. **Restart your backend server:**
```bash
cd CAPSTONE/backend
npm run dev
```

### Fix 2: Get the Correct Connection String from Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/htmghjogrouslqmpimht
   - Login if needed

2. **Navigate to Database Settings:**
   - Click "Database" in the left sidebar
   - Click "Connection String" tab

3. **Copy the Connection String:**
   - Select "URI" format
   - Choose "Connection Pooling" mode (for production) OR "Direct Connection" mode (for development)
   - Copy the connection string
   - **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual password: `09651221953Gr`

4. **Update your `.env` file:**
   ```env
   DATABASE_URL=<paste-the-connection-string-here>
   ```

### Fix 3: Check Network Connectivity

The timeout might be caused by network issues:

1. **Test if you can reach Supabase:**
   ```bash
   ping aws-1-ap-southeast-1.pooler.supabase.com
   ```

2. **Check if the port is accessible:**
   ```bash
   # For Windows (PowerShell)
   Test-NetConnection -ComputerName aws-1-ap-southeast-1.pooler.supabase.com -Port 6543
   
   # For Mac/Linux
   nc -zv aws-1-ap-southeast-1.pooler.supabase.com 6543
   ```

3. **Check your firewall settings:**
   - Make sure your firewall isn't blocking outbound connections to Supabase
   - Try temporarily disabling your firewall to test

### Fix 4: Verify Database is Running

1. **Check Supabase Dashboard:**
   - Go to https://supabase.com/dashboard/project/htmghjogrouslqmpimht
   - Check if there are any alerts or issues with your database
   - Look for "Database" status indicator (should be green)

2. **Check for Maintenance:**
   - Visit https://status.supabase.com/
   - Check if there are any ongoing incidents or maintenance

### Fix 5: Increase Timeout Settings

The code has been updated to:
- Increase connection timeout from 10 to 30 seconds
- Add retry logic (3 attempts with 2-second delays)
- Better error messages

If you're still getting timeouts, you might need to:

1. **Check your internet speed:**
   - Slow internet can cause connection timeouts
   - Try from a different network

2. **Use a VPN:**
   - Some ISPs or networks might block certain cloud services
   - Try connecting through a VPN

## Understanding Connection Modes

### Pooler (Port 6543)
- **Pros:** Better for production, handles many connections efficiently
- **Cons:** Slightly higher latency, might timeout on slow networks
- **Use when:** Deploying to production, expecting high traffic

### Direct Connection (Port 5432)
- **Pros:** Lower latency, more reliable for development
- **Cons:** Limited number of connections (max 60 on free tier)
- **Use when:** Local development, testing, debugging

## Recommended Connection Strings

### For Development (Local)
```env
# Direct connection - more reliable for development
DATABASE_URL=postgresql://postgres.htmghjogrouslqmpimht:09651221953Gr@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### For Production (Deployed)
```env
# Pooler connection - better for production
DATABASE_URL=postgresql://postgres.htmghjogrouslqmpimht:09651221953Gr@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

## Testing the Connection

After making changes, test the connection:

1. **Restart the backend:**
   ```bash
   cd CAPSTONE/backend
   npm run dev
   ```

2. **Look for success message:**
   ```
   ✅ PostgreSQL connection successful!
   📊 Database: postgres
   🔧 PostgreSQL version: PostgreSQL 15.x
   ```

3. **If it fails, check the error message:**
   - The updated code now provides detailed troubleshooting steps
   - Follow the suggestions in the error message

## Still Not Working?

If none of the above fixes work:

1. **Check Supabase Project Status:**
   - Your project might be paused (free tier projects pause after inactivity)
   - Go to dashboard and check if you need to unpause it

2. **Reset Database Password:**
   - Go to Supabase Dashboard → Database → Settings
   - Reset the database password
   - Update your `.env` file with the new password

3. **Contact Supabase Support:**
   - Go to https://supabase.com/dashboard/support
   - Create a support ticket
   - Mention your project ID: `htmghjogrouslqmpimht`
   - Describe the connection timeout issue

4. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Look for any connection errors or issues

## Environment Variables Checklist

Make sure your `CAPSTONE/backend/.env` file has:

```env
# Database
DATABASE_URL=postgresql://postgres.htmghjogrouslqmpimht:09651221953Gr@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require

# Supabase
SUPABASE_URL=https://htmghjogrouslqmpimht.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bWdoam9ncm91c2xxbXBpbWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MzcyNDgsImV4cCI6MjA3NjQxMzI0OH0.8r_wozENW62PL3zKOeDvPtmzt0TGY5RBXIqDDeX1SXQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bWdoam9ncm91c2xxbXBpbWh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDgzNzI0OCwiZXhwIjoyMDc2NDEzMjQ4fQ.T8zXRr75LPKch-1ZMzrXccFaU1RkRFrfK6RfETTWpJc

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=9d7d3b79c6a542ff8b54c75e3f7bd393af2e491dcb7b45678901234567890abc
JWT_EXPIRE=30d
```

## Next Steps

1. **Try Fix 1 first** (switch to direct connection port 5432)
2. **If that doesn't work**, get the latest connection string from Supabase Dashboard (Fix 2)
3. **If still failing**, check network connectivity (Fix 3)
4. **If all else fails**, contact Supabase support

Good luck! 🚀

