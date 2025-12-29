# Fix Purchases Trigger Migration Instructions

## Problem
The `check_beginning_inventory_expiry` trigger was resetting `purchases` to 0 even when purchases were being explicitly updated (e.g., when adding stock to purchases for duplicate items).

## Solution
Updated the trigger function to preserve the `purchases` value when it's being explicitly updated, while still allowing the annual reset when purchases are not being changed.

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `backend/migrations/fix_purchases_trigger.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Using psql (if you have direct database access)
```bash
psql -h [your-db-host] -U [your-user] -d [your-database] -f backend/migrations/fix_purchases_trigger.sql
```

## What This Migration Does
1. Updates the `check_beginning_inventory_expiry()` function to check if `purchases` is being explicitly updated
2. If `purchases` is being updated (NEW.purchases != OLD.purchases), it preserves the new value
3. If `purchases` is NOT being updated and 365 days have passed, it resets purchases to 0 (normal annual reset behavior)

## Verification
After running the migration, the trigger should:
- ✅ Preserve purchases when explicitly updated (e.g., when adding stock to purchases)
- ✅ Still reset purchases to 0 during annual reset (when purchases are not being updated)

## Testing
After applying the migration:
1. Add a duplicate item (same name+size)
2. Check backend logs for verification query results
3. Check inventory page - purchases should now persist correctly

