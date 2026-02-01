# Manual Migration Instructions for Student Item Permissions

If the automated migration script doesn't work, follow these steps to run the migrations manually in Supabase.

## Prerequisites

- Access to Supabase Dashboard
- Admin/Superuser permissions in Supabase SQL Editor
- Your Supabase project URL and credentials

## Step 1: Open Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query** (or use an existing query tab)

## Step 2: Run the Complete Migration

Copy and paste the **ENTIRE** contents of this file into the SQL Editor:
```
backend/migrations/create_student_item_permissions_complete.sql
```

**OR** if you prefer to run the original migration and then add the quantity column separately:

### Option A: Run Complete Migration (Recommended)
Use `backend/migrations/create_student_item_permissions_complete.sql` - it includes everything in one file.

### Option B: Run in Two Steps
1. First run: `backend/migrations/create_student_item_permissions.sql`
2. Then run: `backend/migrations/add_quantity_to_student_item_permissions.sql`

## Step 3: Execute the Migration

1. **Paste the SQL** into the SQL Editor
2. **Click "Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)
3. **Wait for completion** - you should see "Success. No rows returned" or similar

**Expected Result:**
- ✅ Table `student_item_permissions` created
- ✅ All indexes created
- ✅ Foreign key constraint created (references `students(id)`)
- ✅ Trigger created
- ✅ Quantity column included (if using complete migration)

## Step 4: Verify the Migration

Run the verification script to ensure everything is set up correctly:

Copy and paste the contents of:
```
backend/scripts/verify_student_permissions_table.sql
```

**Expected Results:**

1. **Table exists:** `table_exists = true`
2. **Columns (7 total):**
   - `id` (uuid, NOT NULL)
   - `student_id` (uuid, NOT NULL)
   - `item_name` (text, NOT NULL)
   - `enabled` (boolean, NOT NULL, default: true)
   - `quantity` (integer, nullable) ← **Must exist**
   - `created_at` (timestamp with time zone)
   - `updated_at` (timestamp with time zone)

3. **Foreign Key:** `student_id` → `students(id)`
4. **Indexes:** 5 indexes (including primary key)
5. **Trigger:** `trigger_update_student_item_permissions_updated_at`

## Step 5: Test the Setup (Optional)

After verification, you can test inserting a permission:

```sql
-- First, get a valid student ID
SELECT id, name, email FROM students LIMIT 1;

-- Then test insert (replace STUDENT_ID_HERE with actual student ID from above)
INSERT INTO student_item_permissions (student_id, item_name, enabled, quantity)
VALUES (
  'STUDENT_ID_HERE'::uuid,  -- Replace with actual student ID
  'jogging pants',
  true,
  2
)
ON CONFLICT (student_id, item_name) 
DO UPDATE SET 
  enabled = EXCLUDED.enabled,
  quantity = EXCLUDED.quantity,
  updated_at = NOW()
RETURNING *;
```

**Expected:** Should return the inserted/updated row without errors.

## Troubleshooting

### Error: "relation 'students' does not exist"
**Cause:** The `students` table doesn't exist in your database.

**Solution:** 
1. Check if you need to run the `create_students_and_staff_tables.sql` migration first
2. Verify the table name is correct (should be `students`, not `student`)

### Error: "relation 'student_item_permissions' already exists"
**Cause:** The table was already created.

**Solution:** 
- ✅ This is OK - the migration uses `CREATE TABLE IF NOT EXISTS`
- The table already exists, so you can skip this step
- Just verify the structure matches what's expected

### Error: "column 'quantity' does not exist"
**Cause:** You ran the old migration without the quantity column.

**Solution:**
1. Run the `add_quantity_to_student_item_permissions.sql` migration
2. OR run the complete migration (it will skip existing table but add missing column)

### Error: "permission denied for table students"
**Cause:** Your database user doesn't have permission to create foreign keys.

**Solution:**
- Contact your database administrator
- Or use a superuser account to run the migration

### Error: "function uuid_generate_v4() does not exist"
**Cause:** UUID extension not enabled.

**Solution:**
Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "constraint 'unique_student_item_permission' already exists"
**Cause:** Constraint was already created.

**Solution:**
- ✅ This is OK - the migration uses `IF NOT EXISTS` where possible
- The constraint already exists, so you can continue

### Foreign Key Points to Wrong Table
**Issue:** If the foreign key references `users(id)` but should reference `students(id)`

**Solution:**
1. Drop the existing foreign key:
```sql
ALTER TABLE student_item_permissions
DROP CONSTRAINT IF EXISTS student_item_permissions_student_id_fkey;
```

2. Add the correct foreign key:
```sql
ALTER TABLE student_item_permissions
ADD CONSTRAINT student_item_permissions_student_id_fkey
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
```

## After Migration

Once the migration is complete and verified:

1. **Restart your backend server** (if running)
2. **Test the functionality:**
   - Open Edit Student modal in System Admin
   - Enable an item for a student (e.g., "jogging pants" for "rafael ramos")
   - Save permissions
   - Verify no 500 errors
   - Check that the student can now place orders for that item

## Verification Checklist

- [ ] Table `student_item_permissions` exists
- [ ] All 7 columns are present (including `quantity`)
- [ ] Foreign key references `students(id)` (not `users(id)`)
- [ ] All 5 indexes are created
- [ ] Trigger exists and is active
- [ ] Can insert test permission without errors
- [ ] Can query permissions for a student
- [ ] Backend can save permissions without 500 errors

## Need Help?

If you encounter issues not covered here:

1. Check the backend console logs for detailed error messages
2. Verify your Supabase project settings
3. Check that all prerequisite tables exist (`students`, `users`)
4. Review the verification script output for clues

---

**Migration Files:**
- Complete: `backend/migrations/create_student_item_permissions_complete.sql`
- Original: `backend/migrations/create_student_item_permissions.sql`
- Add Quantity: `backend/migrations/add_quantity_to_student_item_permissions.sql`
- Verification: `backend/scripts/verify_student_permissions_table.sql`
