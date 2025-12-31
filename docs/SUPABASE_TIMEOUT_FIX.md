# Fixing Supabase Database Timeout Errors

## Problem
You're experiencing PostgreSQL statement timeout errors (error code `57014`) when fetching orders and inventory items:

```
{
  code: '57014',
  details: null,
  hint: null,
  message: 'canceling statement due to statement timeout'
}
```

## Root Cause
Supabase has a default **statement timeout** setting at the database level that cancels queries that take too long to execute. This is a security feature to prevent long-running queries from consuming resources.

## Solution

### Option 1: Increase Statement Timeout in Supabase Dashboard (Recommended)

1. **Log in to your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `Grraffic's Project`

2. **Navigate to Database Settings**
   - Click on "Database" in the left sidebar
   - Click on "Configuration" tab

3. **Update Statement Timeout**
   - Look for "Statement Timeout" setting
   - Default is usually 60 seconds (60000ms)
   - Increase to 120 seconds (120000ms) or higher
   - Click "Save"

4. **Alternative: Use SQL Editor**
   If the UI doesn't have this option, you can run this SQL command:
   ```sql
   ALTER DATABASE postgres SET statement_timeout = '120s';
   ```
   
   Or for the current session only:
   ```sql
   SET statement_timeout = '120s';
   ```

### Option 2: Optimize Database Queries

If increasing the timeout doesn't help, you may need to optimize your queries:

1. **Add Database Indexes**
   ```sql
   -- Add index on frequently queried columns
   CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
   CREATE INDEX IF NOT EXISTS idx_orders_education_level ON orders(education_level);
   CREATE INDEX IF NOT EXISTS idx_orders_student_id ON orders(student_id);
   CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
   
   CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
   CREATE INDEX IF NOT EXISTS idx_inventory_education_level ON inventory(education_level);
   CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
   ```

2. **Reduce Data Volume**
   - Limit the number of records fetched per request
   - Use pagination more aggressively
   - Archive old orders to a separate table

### Option 3: Use Connection Pooling

Supabase uses connection pooling by default, but you can optimize it:

1. **Check Connection Pool Settings**
   - In Supabase Dashboard → Database → Connection Pooling
   - Ensure "Transaction" mode is enabled
   - Adjust pool size if needed

### Option 4: Check for Slow Queries

1. **Enable Query Performance Insights**
   - In Supabase Dashboard → Database → Query Performance
   - Identify slow queries
   - Optimize them with proper indexes

## Verification

After applying the fix, test by:

1. **Restart your backend server**
   ```bash
   cd CAPSTONE/backend
   npm run dev
   ```

2. **Test the Orders API**
   ```bash
   curl http://localhost:5000/api/orders
   ```

3. **Test the Inventory API**
   ```bash
   curl http://localhost:5000/api/inventory
   ```

4. **Check the admin Orders page**
   - Navigate to http://localhost:5173/admin/orders
   - Verify that orders load without timeout errors

## Additional Notes

- The client-side timeout has been increased in `backend/src/config/supabase.js`
- However, this won't help if the database-level timeout is lower
- The database-level timeout takes precedence
- If you're on Supabase Free tier, there may be limitations on timeout settings

## Contact Supabase Support

If you can't change the timeout setting in the dashboard:
1. Go to https://supabase.com/dashboard/support
2. Create a support ticket
3. Request to increase the statement timeout for your project
4. Mention your project ID: `htmghjogrouslqmpimht`

