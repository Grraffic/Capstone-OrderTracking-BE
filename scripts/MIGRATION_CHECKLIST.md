# Student Item Permissions - Migration Checklist

## ✅ Issues Found and Fixed

### 1. Authentication Issue (401 Unauthorized) - **FIXED**
- **Problem:** Routes were missing `verifyToken` middleware
- **Fix:** Added `router.use(verifyToken)` to `backend/src/routes/system_admin/student_permissions.js`
- **Status:** ✅ Fixed

### 2. Error Handling Improvements - **FIXED**
- **Problem:** Services didn't provide clear errors when table doesn't exist
- **Fix:** Added better error messages in `student_item_permissions.service.js`
- **Status:** ✅ Fixed

### 3. Frontend Error Handling - **FIXED**
- **Problem:** Items API errors weren't handled gracefully
- **Fix:** Improved error handling in `EditStudentOrderLimitsModal.jsx`
- **Status:** ✅ Fixed

## 📋 Pre-Migration Checklist

Before running migrations, verify:

- [ ] Backend server is running
- [ ] Supabase credentials are configured in `.env`
- [ ] You have admin access to Supabase SQL Editor
- [ ] Backend server has been restarted after route changes

## 🚀 Migration Steps

### Option 1: Automated Check (Recommended)

Run the migration checker script:

```bash
node backend/scripts/run_student_permissions_migration.js
```

This script will:
1. ✅ Check if table exists
2. ✅ Check if quantity column exists
3. ✅ Display SQL for missing migrations
4. ✅ Verify setup after migrations

### Option 2: Manual Migration

Follow the instructions in: `backend/scripts/run_migrations_manual.md`

**Quick Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Run: `backend/migrations/create_student_item_permissions.sql`
3. Run: `backend/migrations/add_quantity_to_student_item_permissions.sql`
4. Verify with: `backend/scripts/verify_student_permissions_table.sql`

## 🔍 Verification

After migrations, verify:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'student_item_permissions'
);

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'student_item_permissions'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid)
- `student_id` (uuid) 
- `item_name` (text)
- `enabled` (boolean)
- `quantity` (integer, nullable) ← **Must exist**
- `created_at` (timestamp)
- `updated_at` (timestamp)

## 🧪 Testing

After migrations are complete:

1. **Restart backend server**
   ```bash
   # Stop and restart your backend
   ```

2. **Test Authentication**
   - Login as system_admin
   - Check browser console for auth token
   - Verify token is in localStorage

3. **Test API Endpoints**
   - GET `/api/system-admin/student-permissions/:studentId/items`
   - POST `/api/system-admin/student-permissions/:studentId`
   - Should return 200 (not 401)

4. **Test Frontend**
   - Open Edit Student modal
   - Items should load
   - Permissions should save without 401 errors

## 🐛 Troubleshooting

### Still getting 401 errors?

1. **Check Authentication:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem("authToken"));
   ```

2. **Check User Role:**
   - Verify user has `system_admin` role in database
   - Check JWT token payload contains correct role

3. **Check Backend Logs:**
   - Look for "[Auth Middleware]" messages
   - Verify token is being verified correctly

### Table doesn't exist errors?

1. **Run migrations manually** (see Option 2 above)
2. **Verify table exists** using verification script
3. **Check Supabase logs** for migration errors

### Items not loading?

1. **Check items API:**
   ```bash
   curl http://localhost:5000/api/items?userEducationLevel=College&limit=10
   ```

2. **Check education level mapping:**
   - Verify student has `education_level` set
   - Check `getEducationLevel()` function logic

## 📝 Files Modified

- ✅ `backend/src/routes/system_admin/student_permissions.js` - Added verifyToken
- ✅ `backend/src/services/system_admin/student_item_permissions.service.js` - Better error handling
- ✅ `frontend/src/system-admin/components/StudentManagement/EditStudentOrderLimitsModal.jsx` - Better error handling

## 📝 Files Created

- ✅ `backend/migrations/create_student_item_permissions.sql` - Create table
- ✅ `backend/migrations/add_quantity_to_student_item_permissions.sql` - Add quantity column
- ✅ `backend/scripts/run_student_permissions_migration.js` - Migration checker
- ✅ `backend/scripts/verify_student_permissions_table.sql` - Verification queries
- ✅ `backend/scripts/run_migrations_manual.md` - Manual instructions
- ✅ `backend/scripts/MIGRATION_CHECKLIST.md` - This file

## ✅ Final Checklist

- [ ] Migrations run successfully
- [ ] Table exists with all columns
- [ ] Backend server restarted
- [ ] Authentication working (no 401 errors)
- [ ] Items loading in frontend
- [ ] Permissions saving successfully

---

**Need Help?** Check the manual migration guide: `backend/scripts/run_migrations_manual.md`
