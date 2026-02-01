const supabase = require("../../config/supabase");
const emailRoleAssignmentService = require("./emailRoleAssignment.service");
const { resolveItemKey } = require("../../config/itemMaxOrder");
const crypto = require("crypto");

/**
 * User Service
 *
 * Handles all database operations for user management
 */

/**
 * Get all users with pagination, search, and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.search - Search term for name, email, username
 * @param {string} options.role - Filter by role
 * @param {string} options.status - Filter by status (active/inactive/pending)
 * @param {string} options.education_level - Filter by education level
 * @param {string} options.course_year_level - Filter by course/year level
 * @returns {Promise<Object>} Users data with pagination info
 */
async function getUsers({
  page = 1,
  limit = 10,
  search = "",
  role = "",
  status = "",
  education_level = "",
  course_year_level = "",
  school_year = "",
  excludeRole = "",
}) {
  try {
    const listStaff = excludeRole && String(excludeRole).trim() === "student";
    const table = listStaff ? "staff" : "students";

    let query = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      if (listStaff) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      } else {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
      }
    }

    if (listStaff) {
      if (role && role !== "All Roles") {
        query = query.eq("role", role);
      }
      if (status && status !== "All Status") {
        if (status === "Active") query = query.eq("status", "active");
        else if (status === "Inactive") query = query.eq("status", "inactive");
      }
    } else {
      // Student filters
    }

    if (!listStaff) {
      const trimmedEducationLevel = (education_level != null) ? String(education_level).trim() : "";
      if (trimmedEducationLevel && trimmedEducationLevel !== "All Education Levels") {
        query = query.eq("education_level", trimmedEducationLevel);
      }
      if (course_year_level && typeof course_year_level === "string" && course_year_level.trim() !== "" && course_year_level !== "All Grade Levels") {
        query = query.ilike("course_year_level", course_year_level.trim());
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const rows = (data || []).map((u) => {
      if (listStaff) {
        return { ...u, role: u.role, is_active: u.status === "active" };
      }
      return { ...u, role: "student" };
    });

    if (rows.length > 0 && !listStaff) {
      const studentIds = rows.map((u) => u.id).filter(Boolean);
      const placedStatuses = ["pending", "paid", "claimed", "processing", "ready", "payment_pending", "completed"];
      
      // Create a map of student_id -> total_item_limit_set_at for filtering
      const limitSetAtByStudentId = {};
      for (const u of rows) {
        if (u.total_item_limit_set_at) {
          limitSetAtByStudentId[u.id] = u.total_item_limit_set_at;
        }
      }
      
      const { data: placedOrders } = await supabase
        .from("orders")
        .select("student_id, items, created_at")
        .eq("is_active", true)
        .in("status", placedStatuses)
        .in("student_id", studentIds);
      
      const slotsByStudentId = {};
      for (const row of placedOrders || []) {
        const sid = row.student_id;
        if (!sid) continue;
        
        // Only count orders created AFTER total_item_limit_set_at (if it exists)
        // This gives students a fresh slate when admin updates their limit
        const limitSetAt = limitSetAtByStudentId[sid];
        if (limitSetAt && row.created_at) {
          const orderDate = new Date(row.created_at);
          const limitDate = new Date(limitSetAt);
          if (orderDate < limitDate) {
            // Skip this order - it was created before the limit was set
            continue;
          }
        }
        
        if (!slotsByStudentId[sid]) slotsByStudentId[sid] = new Set();
        const items = Array.isArray(row.items) ? row.items : [];
        for (const it of items) {
          const rawName = (it.name || "").trim();
          let key = resolveItemKey(rawName);
          if (!key && rawName) {
            const lower = rawName.toLowerCase();
            if (lower.includes("jogging pants")) key = "jogging pants";
            if (lower.includes("logo patch")) key = "logo patch";
          }
          if (key) slotsByStudentId[sid].add(key);
        }
      }
      for (const u of rows) {
        u.slots_used_from_placed_orders = slotsByStudentId[u.id] ? slotsByStudentId[u.id].size : 0;
        u.total_item_limit = u.total_item_limit ?? u.max_items_per_order ?? null;
        u.blocked_due_to_void = u.total_item_limit === 0;
      }
    }

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Get a single user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
async function getUserById(userId) {
  try {
    let data = null;
    let error = null;
    const { data: studentRow } = await supabase.from("students").select("*").eq("id", userId).maybeSingle();
    if (studentRow) {
      data = { ...studentRow, role: "student" };
      return data;
    }
    const { data: staffRow } = await supabase.from("staff").select("*").eq("id", userId).maybeSingle();
    if (staffRow) {
      data = { ...staffRow, is_active: staffRow.status === "active" };
      return data;
    }
    const result = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    data = result.data;
    error = result.error;
    if (error) throw error;
    if (data && (data.max_items_per_order !== undefined || data.total_item_limit !== undefined)) {
      data.total_item_limit = data.total_item_limit ?? data.max_items_per_order;
    }
    return data;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} createdByUserId - User ID of the system admin creating the user (for email_role_assignments)
 * @returns {Promise<Object>} Created user
 */
async function createUser(userData, createdByUserId = null) {
  try {
    const normalizedEmail = userData.email?.toLowerCase().trim();

    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    if (!userData.role) {
      throw new Error("Role is required");
    }

    // Determine if this is a student or staff based on email domain
    const isStudentEmail = normalizedEmail.endsWith("@student.laverdad.edu.ph");
    const isStudentRole = userData.role === "student";

    // Check if user already exists in students or staff tables
    let existingUser = null;
    if (isStudentEmail || isStudentRole) {
      const { data: studentUser } = await supabase
        .from("students")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle();
      existingUser = studentUser;
    } else {
      const { data: staffUser } = await supabase
        .from("staff")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle();
      existingUser = staffUser;
    }

    if (existingUser) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    // Step 1: Try to create user in Supabase Auth using Admin API
    // This allows them to log in via Google OAuth
    let authUserId = null;
    try {
      // Use the REST API approach since admin methods might not be available in all Supabase JS versions
      // Create a user in Auth with email confirmation
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true, // Auto-confirm so they can use OAuth
          user_metadata: {
            name: userData.name || "",
          },
        });

      if (authError) {
        // If user already exists in Auth, that's okay - they can still log in
        if (
          authError.message?.includes("already registered") ||
          authError.message?.includes("already exists")
        ) {
          console.log(
            `User ${normalizedEmail} already exists in Auth, will use existing account`
          );
          // Try to get existing user
          try {
            // List users and find by email (this is a workaround if getUserByEmail isn't available)
            const {
              data: { users },
            } = await supabase.auth.admin.listUsers();
            const existingAuthUser = users?.find(
              (u) => u.email?.toLowerCase() === normalizedEmail
            );
            if (existingAuthUser) {
              authUserId = existingAuthUser.id;
            }
          } catch (listErr) {
            console.warn(
              "Could not retrieve existing Auth user:",
              listErr.message
            );
          }
        } else {
          console.warn(
            "Could not create Auth user (they'll need to log in via OAuth first):",
            authError.message
          );
          // Continue anyway - they can log in via OAuth and the passport strategy will handle it
        }
      } else if (authData?.user) {
        authUserId = authData.user.id;
        console.log(
          `✅ Created Auth user for ${normalizedEmail} with ID: ${authUserId}`
        );
      }
    } catch (authErr) {
      console.warn(
        "Error creating Auth user (user will need to log in via OAuth first):",
        authErr.message
      );
      // Continue - the passport strategy will create the Auth user when they log in
    }

    // Generate user_id if we don't have an authUserId
    if (!authUserId) {
      // Generate a UUID for user_id (will be updated on first OAuth login)
      authUserId = crypto.randomUUID();
    }

    // Helper function to calculate education_level from course_year_level
    const calculateEducationLevel = (courseYearLevel) => {
      if (!courseYearLevel) return null;
      const level = String(courseYearLevel).trim();
      
      // Preschool: Prekindergarten and Kindergarten
      if (level === "Prekindergarten" || level === "Kindergarten" || level === "Kinder") {
        return "Kindergarten";
      }
      
      // Elementary (Grades 1-6)
      if (level.match(/^Grade [1-6]$/)) {
        return "Elementary";
      }
      
      // Junior High School (Grades 7-10)
      if (level.match(/^Grade (7|8|9|10)$/)) {
        return "Junior High School";
      }
      
      // Senior High School (Grades 11-12)
      if (level.match(/^Grade (11|12)$/)) {
        return "Senior High School";
      }
      
      // College Programs (BSIS, BSA, BSAIS, BSSW, BAB, ACT)
      if (level.match(/^(BSIS|BSA|BSAIS|BSSW|BAB|ACT) (1st|2nd|3rd|4th) (Year|yr)$/i)) {
        return "College";
      }
      
      return null;
    };

    // Step 2: Create user record in the appropriate table (students or staff)
    let dbUser = null;
    
    if (isStudentEmail || isStudentRole) {
      // Calculate education_level from course_year_level if not provided
      const courseYearLevel = userData.course_year_level || null;
      const educationLevel = userData.education_level || calculateEducationLevel(courseYearLevel);
      
      // When admin creates a student, all required fields are provided, so mark onboarding as completed
      // Check if all required fields are present (non-empty strings/values)
      const hasRequiredFields = 
        userData.name && 
        String(userData.name).trim() &&
        userData.student_number && 
        String(userData.student_number).trim() &&
        courseYearLevel && 
        String(courseYearLevel).trim() &&
        userData.gender && 
        String(userData.gender).trim() &&
        userData.student_type && 
        String(userData.student_type).trim();
      
      // If admin is creating student with all required fields, explicitly mark onboarding as completed
      // Only override if not explicitly set to false
      const shouldMarkOnboardingComplete = hasRequiredFields && 
        (userData.onboarding_completed !== false);
      
      // Explicitly set to boolean true or false (never null/undefined)
      const onboardingCompleted = shouldMarkOnboardingComplete ? true : false;
      const onboardingCompletedAt = shouldMarkOnboardingComplete ? new Date().toISOString() : null;

      // Insert into students table
      const studentRecord = {
        user_id: authUserId,
        email: normalizedEmail,
        name: userData.name || "",
        student_number: userData.student_number || null,
        course_year_level: courseYearLevel,
        education_level: educationLevel,
        enrollment_status: userData.enrollment_status || "currently_enrolled",
        total_item_limit: userData.total_item_limit || null,
        order_lockout_period: userData.order_lockout_period || null,
        order_lockout_unit: userData.order_lockout_unit || null,
        gender: userData.gender || null,
        student_type: userData.student_type || null,
        onboarding_completed: onboardingCompleted,
        onboarding_completed_at: onboardingCompletedAt,
        avatar_url: userData.avatar_url || null,
        photo_url: userData.photo_url || null,
      };

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert(studentRecord)
        .select()
        .single();

      if (studentError) {
        // If we created an Auth user but database insert failed, try to clean up
        if (authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
          } catch (cleanupErr) {
            console.error(
              "Failed to cleanup Auth user after database error:",
              cleanupErr
            );
          }
        }
        throw studentError;
      }

      dbUser = { ...studentData, role: "student" };
    } else {
      // Insert into staff table
      const staffRecord = {
        user_id: authUserId,
        email: normalizedEmail,
        name: userData.name || "",
        role: userData.role,
        status: userData.is_active === false ? "inactive" : "active",
        avatar_url: userData.avatar_url || null,
        photo_url: userData.photo_url || null,
      };

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .insert(staffRecord)
        .select()
        .single();

      if (staffError) {
        // If we created an Auth user but database insert failed, try to clean up
        if (authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
          } catch (cleanupErr) {
            console.error(
              "Failed to cleanup Auth user after database error:",
              cleanupErr
            );
          }
        }
        throw staffError;
      }

      dbUser = { ...staffData, is_active: staffData.status === "active" };
    }

    // Create user_roles entry
    if (userData.role) {
      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: authUserId, // Use authUserId for user_roles
          role: userData.role,
        },
        {
          onConflict: "user_id,role",
        }
      );

      if (roleError) {
        console.error("Failed to create user_roles entry:", roleError);
        // Don't throw - this is not critical for user creation
      }
    }

    // Create email_role_assignments entry for non-student roles
    // This ensures the role persists even if they log in via OAuth
    if (
      (userData.role === "property_custodian" ||
        userData.role === "system_admin" ||
        userData.role === "finance_staff" ||
        userData.role === "accounting_staff" ||
        userData.role === "department_head") &&
      createdByUserId
    ) {
      try {
        // Get the staff ID of the creator for email_role_assignments
        const { data: creatorStaff } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", createdByUserId)
          .maybeSingle();
        
        const assignedByStaffId = creatorStaff?.id || createdByUserId;
        
        await emailRoleAssignmentService.assignEmailRole(
          normalizedEmail,
          userData.role,
          assignedByStaffId
        );
      } catch (assignmentError) {
        // Log but don't fail - email_role_assignments is for preventing role reversion
        console.warn(
          "Warning: Failed to create email_role_assignments:",
          assignmentError.message
        );
      }
    }

    return dbUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

/**
 * Update a user
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {string} updatedByUserId - User ID of the system admin making the update (for email_role_assignments)
 * @returns {Promise<Object>} Updated user
 */
async function updateUser(userId, updates, updatedByUserId = null) {
  try {
    // Determine which table the user is in (students, staff, or users for backward compatibility)
    let currentUser = null;
    let userTable = null;
    let userRole = null;
    let actualUserId = userId; // Use this for the actual database update (might be different from input userId)

    // Check students table first - try both id and user_id fields
    let studentRow = null;
    const { data: studentById } = await supabase
      .from("students")
      .select("id, user_id, email")
      .eq("id", userId)
      .maybeSingle();

    if (studentById) {
      studentRow = studentById;
    } else {
      // Try user_id field as well (in case frontend is passing user_id instead of id)
      const { data: studentByUserId } = await supabase
        .from("students")
        .select("id, user_id, email")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (studentByUserId) {
        studentRow = studentByUserId;
      }
    }

    if (studentRow) {
      currentUser = { ...studentRow, role: "student", is_active: true };
      userTable = "students";
      userRole = "student";
      // Use the actual id from the table for updates
      actualUserId = studentRow.id;
    } else {
      // Check staff table - try both id and user_id fields
      let staffRow = null;
      const { data: staffById } = await supabase
        .from("staff")
        .select("id, user_id, email, role, status")
        .eq("id", userId)
        .maybeSingle();

      if (staffById) {
        staffRow = staffById;
      } else {
        // Try user_id field as well (in case frontend is passing user_id instead of id)
        const { data: staffByUserId } = await supabase
          .from("staff")
          .select("id, user_id, email, role, status")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (staffByUserId) {
          staffRow = staffByUserId;
        }
      }

      if (staffRow) {
        currentUser = { ...staffRow, role: staffRow.role, is_active: staffRow.status === "active" };
        userTable = "staff";
        userRole = staffRow.role;
        // Use the actual id from the table for updates
        actualUserId = staffRow.id;
      }
    }

    // If user not found in students or staff tables, they don't exist
    if (!currentUser || !userTable) {
      throw new Error(`User with ID ${userId} not found in students or staff tables`);
    }

    // Check if trying to change role from system_admin to something else
    if (
      updates.role &&
      userRole === "system_admin" &&
      updates.role !== "system_admin"
    ) {
      // Count how many active system admins exist (only in staff table now)
      const { count: staffCount, error: countError } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("role", "system_admin")
        .eq("status", "active");

      if (countError) {
        console.error("Error counting system admins:", countError);
        // Don't block the update if we can't count, but log the error
      } else if (staffCount === 1) {
        // This is the last system admin, prevent role change
        throw new Error(
          "Cannot change role: This is the last remaining system admin. At least one system admin must exist."
        );
      }
    }

    // Filter out undefined and null values from updates to prevent database issues
    // But keep empty strings and 0 values as they might be intentional
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => {
        // Keep the value if it's not undefined or null
        // Also keep 0, false, and empty strings as they might be intentional updates
        return value !== undefined && value !== null;
      })
    );

    // Log what we received for debugging
    console.log(`updateUser called with:`, {
      userId,
      updates: JSON.stringify(updates, null, 2),
      cleanUpdates: JSON.stringify(cleanUpdates, null, 2),
      userTable,
    });

    const updateData = {
      ...cleanUpdates,
      updated_at: new Date().toISOString(),
    };
    
    // Remove fields that don't exist in students/staff tables
    if (userTable === "students" || userTable === "staff") {
      // Remove is_active (students/staff don't have this - staff uses status)
      delete updateData.is_active;
      // Remove old column name if present
      delete updateData.max_items_per_order;
      // Remove role (it's stored differently in students/staff)
      if (cleanUpdates.role && userTable === "students") {
        // Students always have role = "student", don't update it
        delete updateData.role;
      }
    }
    
    // When admin sets/updates total_item_limit, reset "used" and void strikes (support both column names for migration)
    // Only set these fields when limitValue is actually provided (not undefined/null/empty string)
    const limitValue = cleanUpdates.total_item_limit !== undefined ? cleanUpdates.total_item_limit : cleanUpdates.max_items_per_order;
    
    // Check if limitValue is a valid number (not undefined, null, empty string, or NaN)
    // Must be >= 1 (0 means blocked, but we require explicit setting)
    const isValidLimit = limitValue !== undefined && 
                         limitValue !== null && 
                         limitValue !== '' && 
                         !isNaN(limitValue) && 
                         Number(limitValue) >= 1;
    
    console.log(`Limit value check:`, {
      limitValue,
      isValidLimit,
      type: typeof limitValue,
      cleanUpdates_total_item_limit: cleanUpdates.total_item_limit,
      cleanUpdates_max_items_per_order: cleanUpdates.max_items_per_order,
    });
    
    if (isValidLimit) {
      const ts = new Date().toISOString();
      updateData.total_item_limit = Number(limitValue);
      updateData.total_item_limit_set_at = ts;
      updateData.unclaimed_void_count = 0;
    } else if (cleanUpdates.total_item_limit !== undefined || cleanUpdates.max_items_per_order !== undefined) {
      // If limit was explicitly provided but is invalid, throw an error
      console.error(`Invalid total_item_limit value provided:`, {
        limitValue,
        type: typeof limitValue,
        cleanUpdates,
      });
      throw new Error(`Invalid total_item_limit value: ${limitValue}. Must be a number >= 1.`);
    } else {
      // Explicitly remove these fields if they were sent as null/undefined/empty
      delete updateData.total_item_limit;
      delete updateData.total_item_limit_set_at;
      delete updateData.unclaimed_void_count;
    }

    // Handle empty update data gracefully (only updated_at)
    const fieldsToUpdate = Object.keys(updateData).filter(key => key !== 'updated_at');
    if (fieldsToUpdate.length === 0) {
      // No meaningful fields to update, just return current user data
      console.log(`No fields to update for user ${actualUserId} in ${userTable} table`);
      const { data: currentData, error: fetchError } = await supabase
        .from(userTable)
        .select("*")
        .eq("id", actualUserId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching current user data:`, fetchError);
        throw new Error(`Failed to fetch user data: ${fetchError.message}`);
      }
      
      if (currentData && (currentData.max_items_per_order !== undefined || currentData.total_item_limit !== undefined)) {
        currentData.total_item_limit = currentData.total_item_limit ?? currentData.max_items_per_order;
      }
      return currentData;
    }

    // Log update data for debugging
    console.log(`Updating user ${actualUserId} in ${userTable} table with:`, JSON.stringify(updateData, null, 2));
    console.log(`Fields to update: ${fieldsToUpdate.join(', ')}`);

    // Validate that we have something meaningful to update
    if (Object.keys(updateData).length === 0 || (Object.keys(updateData).length === 1 && updateData.updated_at)) {
      throw new Error("No valid fields to update");
    }

    // Update the correct table
    console.log(`Attempting to update ${userTable} table for user ${actualUserId}`);
    let result = await supabase
      .from(userTable)
      .update(updateData)
      .eq("id", actualUserId)
      .select()
      .single();

    console.log(`Update result:`, {
      hasError: !!result.error,
      error: result.error,
      hasData: !!result.data,
    });

    // If first update failed and we were setting the limit, retry with old column names (migration not run)
    // Only for students table (users table fallback handled above)
    if (result.error && isValidLimit && userTable === "students") {
      console.log(`Retrying with old column names (max_items_per_order)`);
      const fallbackData = { ...cleanUpdates, updated_at: new Date().toISOString() };
      // Remove new column names
      delete fallbackData.total_item_limit;
      delete fallbackData.total_item_limit_set_at;
      // Use old column names
      fallbackData.max_items_per_order = limitValue;
      fallbackData.max_items_per_order_set_at = new Date().toISOString();
      fallbackData.unclaimed_void_count = 0;
      // Remove fields that don't exist
      delete fallbackData.is_active;
      delete fallbackData.role;
      result = await supabase
        .from(userTable)
        .update(fallbackData)
        .eq("id", actualUserId)
        .select()
        .single();
    }

    const { data, error } = result;
    if (error) {
      // Log detailed error information for debugging
      console.error(`Error updating ${userTable} table:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        updateData,
        actualUserId,
        userTable,
        originalUserId: userId,
      });

      // Provide more informative error messages
      if (error.code === '23514' || error.message?.includes('check constraint')) {
        // Constraint violation - likely education_level
        if (error.message?.includes('education_level')) {
          throw new Error(
            `Invalid education level. Allowed values: Kindergarten, Elementary, Junior High School, Senior High School, College, Vocational. ` +
            `If you're updating to "Junior High School", please run the migration: update_education_level_constraint_students.sql`
          );
        }
        throw new Error(`Database constraint violation: ${error.message}`);
      }
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        throw new Error(`Column does not exist in ${userTable} table: ${error.message}`);
      }
      throw new Error(`Failed to update user in ${userTable} table: ${error.message || 'Unknown error'}`);
    }

    // Update user_roles if role changed
    if (updates.role) {
      // Delete old roles - use actualUserId for the database operation
      await supabase.from("user_roles").delete().eq("user_id", actualUserId);

      // Insert new role
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: updates.role,
      });

      // Sync email_role_assignments table to prevent role reversion
      // This is critical because passport.js checks email_role_assignments on login
      const normalizedEmail = currentUser.email?.toLowerCase().trim();

      if (normalizedEmail) {
        if (
          updates.role === "property_custodian" ||
          updates.role === "system_admin"
        ) {
          // Create or update email_role_assignments entry
          try {
            // Check if assignment exists
            const existingAssignment =
              await emailRoleAssignmentService.getEmailRoleAssignment(
                normalizedEmail
              );

            if (existingAssignment) {
              // Update existing assignment
              await emailRoleAssignmentService.updateEmailRole(
                normalizedEmail,
                updates.role,
                updatedByUserId || userId
              );
            } else {
              // Create new assignment
              await emailRoleAssignmentService.assignEmailRole(
                normalizedEmail,
                updates.role,
                updatedByUserId || userId
              );
            }
          } catch (assignmentError) {
            // Log but don't fail the update if email_role_assignments update fails
            console.warn(
              "Warning: Failed to sync email_role_assignments:",
              assignmentError.message
            );
          }
        } else if (updates.role === "student") {
          // Remove from email_role_assignments if role changed to student
          try {
            // Check if assignment exists before trying to remove
            const existingAssignment =
              await emailRoleAssignmentService.getEmailRoleAssignment(
                normalizedEmail
              );
            if (existingAssignment) {
              await emailRoleAssignmentService.removeEmailRoleAssignment(
                normalizedEmail
              );
            }
          } catch (assignmentError) {
            // Log but don't fail if removal fails (might not exist)
            if (assignmentError.message !== "Email role assignment not found") {
              console.warn(
                "Warning: Failed to remove email_role_assignments:",
                assignmentError.message
              );
            }
          }
        }
      }
    }

    // Ensure frontend always gets total_item_limit (DB may have old column name)
    if (data && (data.max_items_per_order !== undefined || data.total_item_limit !== undefined)) {
      data.total_item_limit = data.total_item_limit ?? data.max_items_per_order;
    }
    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
    });
    
    // Re-throw with more context if it's a generic error
    // Note: userTable might not be defined if error occurred before table detection
    const errorMessage = error.message || 'Unknown error';
    if (errorMessage && !errorMessage.includes(userId)) {
      throw new Error(`Failed to update user ${userId}: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Delete a user (hard delete - removes user from database)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deleted user data (before deletion)
 */
async function deleteUser(userId) {
  try {
    // Determine which table the user is in (students, staff, or users for backward compatibility)
    let currentUser = null;
    let userTable = null;
    let actualUserId = userId; // Use this for the actual database delete (might be different from input userId)
    let userEmail = null;
    let authUserId = null;

    // Check students table first - try both id and user_id fields
    let studentRow = null;
    const { data: studentById } = await supabase
      .from("students")
      .select("id, user_id, email")
      .eq("id", userId)
      .maybeSingle();

    if (studentById) {
      studentRow = studentById;
    } else {
      // Try user_id field as well (in case frontend is passing user_id instead of id)
      const { data: studentByUserId } = await supabase
        .from("students")
        .select("id, user_id, email")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (studentByUserId) {
        studentRow = studentByUserId;
      }
    }

    if (studentRow) {
      currentUser = { ...studentRow, role: "student" };
      userTable = "students";
      // Use the actual id from the table for deletion
      actualUserId = studentRow.id;
      userEmail = studentRow.email;
      authUserId = studentRow.user_id;
    } else {
      // Check staff table - try both id and user_id fields
      let staffRow = null;
      const { data: staffById } = await supabase
        .from("staff")
        .select("id, user_id, email, role, status")
        .eq("id", userId)
        .maybeSingle();

      if (staffById) {
        staffRow = staffById;
      } else {
        // Try user_id field as well (in case frontend is passing user_id instead of id)
        const { data: staffByUserId } = await supabase
          .from("staff")
          .select("id, user_id, email, role, status")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (staffByUserId) {
          staffRow = staffByUserId;
        }
      }

      if (staffRow) {
        currentUser = { ...staffRow, role: staffRow.role };
        userTable = "staff";
        // Use the actual id from the table for deletion
        actualUserId = staffRow.id;
        userEmail = staffRow.email;
        authUserId = staffRow.user_id;
      }
    }

    // If user not found in students or staff tables, they don't exist
    if (!currentUser || !userTable) {
      throw new Error(`User with ID ${userId} not found in students or staff tables`);
    }

    // Prevent deletion of the last system admin
    if (userTable === "staff" && currentUser.role === "system_admin") {
      const { count: staffCount, error: countError } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("role", "system_admin");

      if (countError) {
        console.error("Error counting system admins:", countError);
        // Don't block the deletion if we can't count, but log the error
      } else if (staffCount === 1) {
        // This is the last system admin, prevent deletion
        throw new Error(
          "Cannot delete user: This is the last remaining system admin. At least one system admin must exist."
        );
      }
    }

    // Store user data before deletion for return value
    const userDataBeforeDelete = { ...currentUser };

    // Delete from user_roles table (cleanup role assignments)
    if (authUserId) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", authUserId);
      
      if (roleError) {
        console.warn("Error deleting user_roles (may not exist):", roleError.message);
        // Don't fail the deletion if user_roles doesn't exist
      }
    }

    // Delete from email_role_assignments if email exists
    if (userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const { error: emailRoleError } = await supabase
        .from("email_role_assignments")
        .delete()
        .eq("email", normalizedEmail);
      
      if (emailRoleError) {
        console.warn("Error deleting email_role_assignments (may not exist):", emailRoleError.message);
        // Don't fail the deletion if email_role_assignments doesn't exist
      }
    }

    // Perform hard delete from the appropriate table
    let result;
    if (userTable === "students") {
      result = await supabase
        .from("students")
        .delete()
        .eq("id", actualUserId)
        .select()
        .single();
    } else if (userTable === "staff") {
      result = await supabase
        .from("staff")
        .delete()
        .eq("id", actualUserId)
        .select()
        .single();
    }

    const { data, error } = result;
    if (error) {
      console.error(`Error deleting user from ${userTable} table:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        actualUserId,
        userTable,
        originalUserId: userId,
      });
      throw error;
    }

    // Optionally delete from Supabase Auth if authUserId exists
    if (authUserId) {
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (authError) {
        console.warn("Error deleting user from Auth (may not exist):", authError.message);
        // Don't fail the deletion if Auth user doesn't exist or deletion fails
      }
    }

    // Return the deleted user data
    return userDataBeforeDelete;
  } catch (error) {
    console.error("Error deleting user:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
    });
    throw error;
  }
}

/**
 * Bulk update users
 * @param {Array<string>} userIds - Array of user IDs to update
 * @param {Object} updateData - Data to update (total_item_limit, order_lockout_period)
 * @returns {Promise<Object>} Update result with count of updated users
 */
async function bulkUpdateUsers(userIds, updateData) {
  try {
    if (!userIds || userIds.length === 0) {
      throw new Error("User IDs array is required");
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error("Update data is required");
    }

    const limitValue = updateData.total_item_limit !== undefined ? updateData.total_item_limit : updateData.max_items_per_order;
    const updateObject = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    if (limitValue !== undefined) {
      updateObject.total_item_limit = limitValue;
      updateObject.total_item_limit_set_at = new Date().toISOString();
      updateObject.unclaimed_void_count = 0;
    }

    let result = await supabase
      .from("users")
      .update(updateObject)
      .in("id", userIds)
      .select();

    // If first update failed and we were setting the limit, retry with old column names (migration not run)
    if (result.error && limitValue !== undefined) {
      const fallback = { ...updateData, updated_at: new Date().toISOString() };
      delete fallback.total_item_limit;
      delete fallback.total_item_limit_set_at;
      fallback.max_items_per_order = limitValue;
      fallback.max_items_per_order_set_at = new Date().toISOString();
      fallback.unclaimed_void_count = 0;
      result = await supabase
        .from("users")
        .update(fallback)
        .in("id", userIds)
        .select();
    }

    const { data, error } = result;
    if (error) {
      throw error;
    }

    return {
      updatedCount: data?.length || 0,
      updatedUsers: data || [],
    };
  } catch (error) {
    console.error("Error bulk updating users:", error);
    throw error;
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  bulkUpdateUsers,
};
