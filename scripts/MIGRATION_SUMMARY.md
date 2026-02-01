# Student Item Permissions Migration Summary

## Quick Start

**The table doesn't exist yet - you need to run the migration!**

### Fastest Way to Fix:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of:
   ```
   backend/migrations/create_student_item_permissions_complete.sql
   ```
3. Click "Run"
4. Verify with: `backend/scripts/verify_student_item_permissions_table.sql`

## What Was Fixed

### Root Cause
The `student_item_permissions` table doesn't exist in your Supabase database. The migration file exists but hasn't been executed.

### Changes Made

1. **Updated Foreign Key Reference**
   - Changed from `users(id)` to `students(id)`
   - Reason: Student data is stored in `students` table, and `student.id` used in frontend comes from `students.id`

2. **Created Complete Migration**
   - `create_student_item_permissions_complete.sql` - Includes everything in one file
   - Includes `quantity` column from the start
   - Proper foreign key to `students(id)`

3. **Updated Original Migration**
   - `create_student_item_permissions.sql` - Updated to reference `students(id)` and include `quantity`

4. **Enhanced Verification Script**
   - Comprehensive checks for table, columns, indexes, constraints, foreign keys
   - Test queries included

5. **Clear Migration Instructions**
   - Step-by-step guide
   - Troubleshooting section
   - Verification steps

## Migration Files

- **Complete (Recommended):** `backend/migrations/create_student_item_permissions_complete.sql`
- **Original (Updated):** `backend/migrations/create_student_item_permissions.sql`
- **Add Quantity Only:** `backend/migrations/add_quantity_to_student_item_permissions.sql`
- **Verification:** `backend/scripts/verify_student_permissions_table.sql`
- **Instructions:** `backend/scripts/run_migrations_manual.md`

## After Migration

Once you run the migration:

1. ✅ Table will exist
2. ✅ Foreign key will reference `students(id)` correctly
3. ✅ Quantity column will be available
4. ✅ System admin can save permissions without 500 errors
5. ✅ Students can place orders for enabled items

## Testing the Flow

After migration, test with "rafael ramos":

1. Open Edit User modal for "rafael ramos"
2. Enable "Jogging Pants" item (check the checkbox)
3. Set quantity if needed (or leave default)
4. Click Save
5. Verify no 500 errors
6. Log in as "rafael ramos"
7. Verify they can see and order "Jogging Pants"

## Important Notes

- **Foreign Key:** Now references `students(id)` not `users(id)`
- **Student IDs:** Must be from `students.id` (which is what the frontend uses)
- **Quantity Column:** Included in complete migration, or run add_quantity migration separately
- **Backward Compatibility:** Service checks both `students` and `users` tables for student lookup
