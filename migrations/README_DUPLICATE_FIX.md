# Fix for Duplicate Student Accounts

## Problem
When students log in multiple times, duplicate accounts were being created in the `students` table with the same email but different `user_id` values.

## Solution
This fix consists of three parts that must be applied in order:

### 1. Cleanup Existing Duplicates
**File:** `cleanup_duplicate_students.sql`

This migration:
- Identifies duplicate student records by email (case-insensitive)
- Keeps the oldest record (by `created_at`) as the primary record
- Migrates foreign key references from duplicates to the primary record:
  - Updates `orders.student_id`
  - Updates `cart_items.student_id`
- Deletes duplicate records

**Run this first** before applying the unique constraint.

### 2. Add Unique Email Constraint
**File:** `add_unique_email_constraint_students.sql`

This migration:
- Normalizes all emails to lowercase
- Checks for remaining duplicates (will fail if any exist)
- Creates a case-insensitive unique index on `email`
- Prevents future duplicate creation at the database level

**Run this second**, after cleanup is complete.

### 3. Update Passport Strategy
**File:** `backend/src/config/passport.js`

The passport authentication strategy has been updated to:
- Always check for existing students by email before creating new records
- Reuse existing `user_id` when a student with the same email is found
- Update existing records instead of creating duplicates
- Handle unique constraint violations gracefully

**This is already applied** - no migration needed.

## Migration Order

1. **First:** Run `cleanup_duplicate_students.sql`
2. **Second:** Run `add_unique_email_constraint_students.sql`
3. **Third:** The code changes in `passport.js` are already in place

## Testing

After applying the migrations, test:
1. Login with existing student - should update, not create duplicate
2. Login with new student - should create new record
3. Login with same email but different casing - should find existing record
4. Verify no duplicates can be created after fix

## Notes

- The unique constraint uses `LOWER(TRIM(email))` to ensure case-insensitive uniqueness
- All emails are normalized to lowercase in the database
- The passport strategy performs a double-check to ensure existing records are found
- Foreign key references are automatically migrated during cleanup
