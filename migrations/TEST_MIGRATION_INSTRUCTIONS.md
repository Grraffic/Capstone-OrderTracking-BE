# Testing the Beginning Inventory Migration

## Quick Test Guide

### Option 1: Run Full Test Script (Recommended)

1. **Open Supabase Dashboard**

   - Go to your Supabase project
   - Navigate to **SQL Editor** in the left sidebar

2. **Run the Test Script**

   - Open file: `backend/migrations/test_beginning_inventory_migration.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **"Run"** (or press Ctrl+Enter)

3. **Review Results**
   - The script will show:
     - Pre-migration checks
     - Post-migration verification
     - Function tests
     - Trigger verification
     - Data integrity checks
     - Summary report

### Option 2: Step-by-Step Testing

#### Step 1: Pre-Migration Check

Run this query first to see current state:

```sql
-- Check current columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;

-- Count items
SELECT COUNT(*) as total_items FROM items;
```

#### Step 2: Run the Migration

1. Open `backend/migrations/add_beginning_inventory_tracking.sql`
2. Copy all SQL code
3. Paste into Supabase SQL Editor
4. Click **"Run"**
5. You should see: `Success. No rows returned` or similar success message

#### Step 3: Verify Migration Success

Run these verification queries:

```sql
-- Check new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'items'
  AND column_name IN ('beginning_inventory', 'purchases', 'beginning_inventory_date', 'fiscal_year_start')
ORDER BY column_name;
```

**Expected Result:** Should show 4 rows with the new columns

```sql
-- Check items were initialized
SELECT
  COUNT(*) as total_items,
  COUNT(beginning_inventory) as with_beginning_inventory,
  COUNT(purchases) as with_purchases,
  COUNT(beginning_inventory_date) as with_date
FROM items;
```

**Expected Result:** All counts should match (all items initialized)

```sql
-- Check sample data
SELECT
  id,
  name,
  stock,
  beginning_inventory,
  purchases,
  beginning_inventory_date,
  fiscal_year_start
FROM items
LIMIT 5;
```

**Expected Result:**

- `beginning_inventory` should equal `stock` (for existing items)
- `purchases` should be `0`
- `beginning_inventory_date` should have a timestamp
- `fiscal_year_start` should have a date

#### Step 4: Test Functions

```sql
-- Test calculate_ending_inventory function
SELECT calculate_ending_inventory(id) as ending_inventory
FROM items
LIMIT 1;
```

**Expected Result:** Should return an integer (ending inventory value)

```sql
-- Test calculate_available_inventory function
SELECT calculate_available_inventory(id) as available_inventory
FROM items
LIMIT 1;
```

**Expected Result:** Should return an integer (available inventory value)

#### Step 5: Verify Trigger

```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'items'
  AND trigger_name = 'trigger_check_beginning_inventory_expiry';
```

**Expected Result:** Should show 1 row with trigger details

#### Step 6: Test Trigger Functionality

To test the expiry trigger, you would need to:

1. Find an item with `beginning_inventory_date` older than 365 days
2. Update its stock
3. Verify that `beginning_inventory` was reset

**Note:** This test requires items older than 1 year. For new databases, you can simulate by temporarily setting an old date:

```sql
-- WARNING: Only run this in a test environment!
-- This simulates an expired beginning inventory
UPDATE items
SET beginning_inventory_date = NOW() - INTERVAL '366 days'
WHERE id = (SELECT id FROM items LIMIT 1);

-- Now update stock to trigger the reset
UPDATE items
SET stock = stock + 10
WHERE id = (SELECT id FROM items WHERE beginning_inventory_date < NOW() - INTERVAL '365 days' LIMIT 1);

-- Check if it was reset
SELECT
  id,
  name,
  stock,
  beginning_inventory,
  purchases,
  beginning_inventory_date
FROM items
WHERE id = (SELECT id FROM items WHERE beginning_inventory_date < NOW() - INTERVAL '365 days' LIMIT 1);
```

**Expected Result:**

- `beginning_inventory` should equal current `stock`
- `purchases` should be `0`
- `beginning_inventory_date` should be recent (just reset)

## Common Issues and Solutions

### Issue 1: "Column already exists" Error

**Solution:** The migration uses `ADD COLUMN IF NOT EXISTS`, so this shouldn't happen. If it does, the columns already exist and migration is complete.

### Issue 2: "Function already exists" Error

**Solution:** The migration uses `CREATE OR REPLACE FUNCTION`, so this is normal. The function is being updated.

### Issue 3: Items not initialized

**Solution:** Check if items have `created_at` timestamps. If not, they'll use `NOW()` as default.

### Issue 4: Trigger not working

**Solution:**

1. Verify trigger exists (see Step 5)
2. Check function `check_beginning_inventory_expiry()` exists
3. Make sure you're updating the `stock` column (trigger fires on `UPDATE OF stock`)

## Success Criteria

✅ All 4 new columns exist in `items` table
✅ All existing items have `beginning_inventory = stock`
✅ All existing items have `purchases = 0`
✅ All existing items have `beginning_inventory_date` set
✅ All existing items have `fiscal_year_start` set
✅ Both calculation functions exist and work
✅ Trigger exists and is active
✅ Indexes were created

## Next Steps After Successful Migration

1. ✅ Migration tested and verified
2. ⏭️ Update backend services to use new columns
3. ⏭️ Update frontend to display beginning inventory and purchases
4. ⏭️ Test stock addition logic (should go to purchases)
5. ⏭️ Test beginning inventory reset after 1 year

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_check_beginning_inventory_expiry ON items;

-- Remove functions
DROP FUNCTION IF EXISTS check_beginning_inventory_expiry();
DROP FUNCTION IF EXISTS calculate_ending_inventory(UUID, TEXT);
DROP FUNCTION IF EXISTS calculate_available_inventory(UUID, TEXT);

-- Remove indexes
DROP INDEX IF EXISTS idx_items_beginning_inventory_date;
DROP INDEX IF EXISTS idx_items_fiscal_year_start;

-- Remove columns
ALTER TABLE items DROP COLUMN IF EXISTS beginning_inventory;
ALTER TABLE items DROP COLUMN IF EXISTS purchases;
ALTER TABLE items DROP COLUMN IF EXISTS beginning_inventory_date;
ALTER TABLE items DROP COLUMN IF EXISTS fiscal_year_start;
```

**⚠️ WARNING:** Only run rollback if absolutely necessary. This will delete all beginning inventory data!
