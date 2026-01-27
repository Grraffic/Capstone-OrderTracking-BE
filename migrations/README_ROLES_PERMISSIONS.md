# Roles and Permissions System - Migration Guide

## ⚠️ Important: Run Migrations First

The Roles and Permissions system requires database tables to be created before use. If you're seeing 500 errors when accessing the Roles & Permissions tab, you need to run the migrations.

## Required Migrations

Run these migrations in order:

### 1. Add New Roles
```bash
# Run this migration to add finance_staff, accounting_staff, and department_head roles
psql $DATABASE_URL -f migrations/add_new_roles.sql
```

### 2. Create Permissions System
```bash
# Run this migration to create permissions and role_permissions tables
psql $DATABASE_URL -f migrations/create_permissions_system.sql
```

## How to Run Migrations

### Option 1: Using psql (Command Line)
```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run migrations
psql $DATABASE_URL -f backend/migrations/add_new_roles.sql
psql $DATABASE_URL -f backend/migrations/create_permissions_system.sql
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file
4. Run them in order:
   - First: `add_new_roles.sql`
   - Second: `create_permissions_system.sql`

### Option 3: Using Database Client (pgAdmin, DBeaver, etc.)
1. Open your database client
2. Connect to your database
3. Open and execute each SQL file in order

## Verification

After running the migrations, verify the tables exist:

```sql
-- Check if permissions table exists
SELECT COUNT(*) FROM permissions;

-- Check if role_permissions table exists
SELECT COUNT(*) FROM role_permissions;

-- Check if new roles are in the constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%';
```

## What the Migrations Do

### `add_new_roles.sql`
- Updates the `users` table CHECK constraint to include: `finance_staff`, `accounting_staff`, `department_head`
- Updates the `user_roles` table CHECK constraint similarly

### `create_permissions_system.sql`
- Creates `permissions` table with default permissions (Orders, Inventory, Users, Roles, Reports, Settings)
- Creates `role_permissions` junction table
- Assigns default permissions to each role:
  - **System Admin**: All permissions
  - **Property Custodian**: Orders, Inventory, Users (view/create/update), Reports
  - **Finance Staff**: Orders (view/approve), Reports (view/export)
  - **Accounting Staff**: Orders (view), Reports (view/export)
  - **Department Head**: Orders (view), Inventory (view), Reports (view)
  - **Student**: No permissions (handled by application logic)

## Troubleshooting

### Error: "relation does not exist"
- Make sure you've run `create_permissions_system.sql` first
- Check that you're connected to the correct database

### Error: "permission denied"
- Ensure your database user has CREATE TABLE permissions
- Check that you're using the correct database credentials

### Error: "constraint already exists"
- The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
- If you get constraint errors, you may need to drop existing constraints first

## After Migration

Once migrations are complete:
1. Restart your backend server
2. Navigate to User Management → Roles & Permissions tab
3. You should see all roles with their permissions
