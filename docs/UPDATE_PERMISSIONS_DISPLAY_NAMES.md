# Update Permissions Display Names - Migration Guide

## Overview

This migration updates the display names of existing permissions to match the desired UI structure for the Role Management interface. It also adds new permissions required for the Admin Portal section.

## What This Migration Does

### Updates Existing Permissions Display Names

**Orders Permissions:**
- `view_orders` → "View All Orders"
- `approve_orders` → "Approve / Process Orders"
- `update_orders` → "Update Order Status"
- `create_orders` → "View Order Status Logs"
- `delete_orders` → "Cancel / Rollback Orders"

**Inventory Permissions (for Item Management):**
- `view_inventory` → "Uniform Items"
- `update_stock` → "Update Item Variants"
- `manage_inventory` → "Activate / Deactivate Items"
- `add_stock` → "View Item Catalog"

**Users Permissions:**
- `update_users` → "Manage users (Students and employee)"

### Adds New Permissions

**Admin Portal Permissions:**
- `override_permissions` → "Override Permissions" (category: Roles)
- `view_audit_logs` → "View Audit Logs" (category: Reports)
- `system_configuration` → "System Configuration" (category: Settings)

## Prerequisites

1. **Database Connection**: Ensure you have access to your database
2. **Previous Migrations**: Make sure you have run `create_permissions_system.sql` first
3. **Backup**: It's recommended to backup your database before running migrations

## How to Run the Migration

### Option 1: Using psql (Command Line)

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Navigate to the backend directory
cd backend

# Run the migration
psql $DATABASE_URL -f migrations/update_permissions_display_names.sql
```

**Example with Supabase:**
```bash
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
psql $DATABASE_URL -f migrations/update_permissions_display_names.sql
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open the file `backend/migrations/update_permissions_display_names.sql`
5. Copy and paste the entire contents into the SQL Editor
6. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Option 3: Using Database Client (pgAdmin, DBeaver, etc.)

1. Open your database client (pgAdmin, DBeaver, DataGrip, etc.)
2. Connect to your database
3. Open a new SQL query window
4. Open the file `backend/migrations/update_permissions_display_names.sql`
5. Copy and paste the SQL into the query window
6. Execute the query

### Option 4: Using Node.js Script (if you have one)

If you have a migration runner script, you can run:

```bash
cd backend
node scripts/run-migration.js migrations/update_permissions_display_names.sql
```

## Verification

After running the migration, verify that the changes were applied correctly:

```sql
-- Check updated Orders permissions
SELECT name, display_name, category 
FROM permissions 
WHERE category = 'Orders' 
ORDER BY name;

-- Expected results:
-- view_orders | View All Orders
-- approve_orders | Approve / Process Orders
-- update_orders | Update Order Status
-- create_orders | View Order Status Logs
-- delete_orders | Cancel / Rollback Orders

-- Check updated Inventory permissions
SELECT name, display_name, category 
FROM permissions 
WHERE category = 'Inventory' 
ORDER BY name;

-- Expected results:
-- view_inventory | Uniform Items
-- update_stock | Update Item Variants
-- manage_inventory | Activate / Deactivate Items
-- add_stock | View Item Catalog

-- Check updated Users permissions
SELECT name, display_name, category 
FROM permissions 
WHERE category = 'Users' 
AND name = 'update_users';

-- Expected result:
-- update_users | Manage users (Students and employee)

-- Check new Admin Portal permissions
SELECT name, display_name, category 
FROM permissions 
WHERE name IN ('override_permissions', 'view_audit_logs', 'system_configuration')
ORDER BY name;

-- Expected results:
-- override_permissions | Override Permissions | Roles
-- view_audit_logs | View Audit Logs | Reports
-- system_configuration | System Configuration | Settings
```

## Rollback (If Needed)

If you need to rollback the changes, you can run this SQL:

```sql
-- Rollback Orders permissions
UPDATE permissions SET display_name = 'View Orders' WHERE name = 'view_orders';
UPDATE permissions SET display_name = 'Approve Orders' WHERE name = 'approve_orders';
UPDATE permissions SET display_name = 'Update Orders' WHERE name = 'update_orders';
UPDATE permissions SET display_name = 'Create Orders' WHERE name = 'create_orders';
UPDATE permissions SET display_name = 'Delete Orders' WHERE name = 'delete_orders';

-- Rollback Inventory permissions
UPDATE permissions SET display_name = 'View Inventory' WHERE name = 'view_inventory';
UPDATE permissions SET display_name = 'Update Stock' WHERE name = 'update_stock';
UPDATE permissions SET display_name = 'Manage Inventory' WHERE name = 'manage_inventory';
UPDATE permissions SET display_name = 'Add Stock' WHERE name = 'add_stock';

-- Rollback Users permissions
UPDATE permissions SET display_name = 'Update Users' WHERE name = 'update_users';

-- Remove new permissions (optional - only if you want to completely remove them)
DELETE FROM permissions WHERE name IN ('override_permissions', 'view_audit_logs', 'system_configuration');
```

## Troubleshooting

### Error: "relation 'permissions' does not exist"

**Solution**: Run the `create_permissions_system.sql` migration first.

```bash
psql $DATABASE_URL -f migrations/create_permissions_system.sql
```

### Error: "permission denied for table permissions"

**Solution**: Make sure you're using a database user with the necessary permissions (usually the postgres superuser or a user with UPDATE privileges).

### Error: "duplicate key value violates unique constraint"

**Solution**: This means the migration has already been run. The `ON CONFLICT DO NOTHING` clause should prevent this, but if you see this error, the migration has likely already been applied.

### Permissions Not Showing in UI

**Solution**: 
1. Verify the migration ran successfully using the verification queries above
2. Clear your browser cache
3. Restart your backend server if it caches permission data
4. Check that the frontend is fetching permissions correctly

## Impact on Existing Roles

This migration **only updates display names** and **adds new permissions**. It does NOT:
- Remove any existing permissions
- Change permission assignments to roles
- Modify permission IDs

Existing role-permission assignments will continue to work. The new permissions (`override_permissions`, `view_audit_logs`, `system_configuration`) will need to be manually assigned to roles if needed.

## Related Files

- Migration file: `backend/migrations/update_permissions_display_names.sql`
- Original permissions migration: `backend/migrations/create_permissions_system.sql`
- Frontend component: `frontend/src/system-admin/components/UserManagement/RoleDetails.jsx`

## Support

If you encounter any issues:
1. Check the verification queries above
2. Review the error messages in your database logs
3. Ensure all prerequisites are met
4. Check that previous migrations have been run successfully
