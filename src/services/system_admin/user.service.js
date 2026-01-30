const supabase = require("../../config/supabase");
const emailRoleAssignmentService = require("./emailRoleAssignment.service");
const { resolveItemKey } = require("../../config/itemMaxOrder");

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
    let query = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
    }

    // Apply role filter
    if (role && role !== "All Roles") {
      query = query.eq("role", role);
    }
    
    // Exclude specific roles (e.g., exclude "student" to hide all students)
    if (excludeRole && typeof excludeRole === "string" && excludeRole.trim() !== "") {
      const trimmedExcludeRole = excludeRole.trim();
      query = query.neq("role", trimmedExcludeRole);
      console.log(`[getUsers] ✅ Excluding role: "${trimmedExcludeRole}" - students will not be shown`);
    }

    // Apply status filter
    if (status && status !== "All Status") {
      if (status === "Active") {
        query = query.eq("is_active", true);
      } else if (status === "Inactive") {
        query = query.eq("is_active", false);
      }
      // Note: "Pending" status might need additional logic based on your requirements
    }

    // Apply education level filter
    // Only filter if education_level is provided and not empty/placeholder
    // Empty string means "show all" (no filter applied)
    // "All Education Levels" maps to "" which means show all students
    // IMPORTANT: Do NOT filter when education_level is empty string - this shows ALL students
    const trimmedEducationLevel = (education_level !== undefined && education_level !== null) 
      ? String(education_level).trim() 
      : "";
    
    // Apply filter ONLY if education_level is a non-empty string
    // Empty string (from "All Education Levels") = show all students (NO FILTER APPLIED)
    // Non-empty string (from specific education level) = filter by that level
    // Also check for explicit "All Education Levels" string for backward compatibility
    const shouldSkipFilter = !trimmedEducationLevel || 
                             trimmedEducationLevel === "" || 
                             trimmedEducationLevel === "All Education Levels";
    
    if (!shouldSkipFilter) {
      // Apply the filter - this will only show students with matching education_level
      query = query.eq("education_level", trimmedEducationLevel);
      console.log(`[getUsers] ✅ APPLYING FILTER - education_level: "${trimmedEducationLevel}"`);
    } else {
      // NO FILTER - this will show ALL students regardless of education_level (including NULL values)
      console.log(`[getUsers] ⚠️ NO FILTER APPLIED - education_level is empty (original: "${education_level}", trimmed: "${trimmedEducationLevel}") - showing ALL students`);
    }

    // Apply course/year level filter
    // Only filter if course_year_level is provided and not empty/placeholder
    // Empty string means "show all" (no filter applied)
    // Frontend mapper normalizes format (e.g., "BSIS 4th yr" -> "BSIS 4th Year")
    // Use case-insensitive matching to handle any remaining format variations
    if (
      course_year_level && 
      typeof course_year_level === "string" && 
      course_year_level.trim() !== "" && 
      course_year_level !== "All Grade Levels"
    ) {
      const trimmedLevel = course_year_level.trim();
      // Use ilike for case-insensitive matching (handles "Year" vs "yr", etc.)
      // Match the normalized format from the mapper
      query = query.ilike("course_year_level", trimmedLevel);
      console.log(`[getUsers] Filtering by course_year_level (case-insensitive): "${trimmedLevel}"`);
    } else {
      console.log(`[getUsers] No course_year_level filter (value: "${course_year_level}")`);
    }

    // NOTE: School year filter is NOT applied here because:
    // - student_number represents the ENROLLMENT year (when student first enrolled), not current school year
    // - Example: "22 - 00023RSR" means student enrolled in 2022, but they may still be enrolled in 2026-2027
    // - The student_number prefix stays fixed until graduation, so filtering by it would exclude valid students
    // - To filter by current school year, we would need a separate enrollment_year or current_school_year field
    // For now, when school_year is selected, we show all students (no filter applied)
    if (
      school_year && 
      typeof school_year === "string" && 
      school_year.trim() !== ""
    ) {
      console.log(`[getUsers] ℹ️ School year selected: ${school_year} - showing all students (student_number represents enrollment year, not current school year)`);
      // No filter applied - student_number prefix represents enrollment year, not current school year
      // Students enrolled in previous years may still be active in the selected school year
    } else {
      console.log(`[getUsers] ℹ️ No school_year filter (value: "${school_year}") - showing all students`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const rows = data || [];
    if (rows.length > 0) {
      const userIds = rows.map((u) => u.id).filter(Boolean);
      const placedStatuses = ["pending", "paid", "claimed", "processing", "ready", "payment_pending", "completed"];
      const { data: placedOrders } = await supabase
        .from("orders")
        .select("student_id, items")
        .eq("is_active", true)
        .in("status", placedStatuses)
        .in("student_id", userIds);
      const slotsByUserId = {};
      for (const row of placedOrders || []) {
        const sid = row.student_id;
        if (!sid) continue;
        if (!slotsByUserId[sid]) slotsByUserId[sid] = new Set();
        const items = Array.isArray(row.items) ? row.items : [];
        for (const it of items) {
          const rawName = (it.name || "").trim();
          let key = resolveItemKey(rawName);
          if (!key && rawName) {
            const lower = rawName.toLowerCase();
            if (lower.includes("jogging pants")) key = "jogging pants";
            if (lower.includes("logo patch")) key = "logo patch";
          }
          if (key) slotsByUserId[sid].add(key);
        }
      }
      // Voided = max_items_per_order set to 0 by auto-void (unclaimed); cleared when admin re-enters max
      for (const u of rows) {
        u.slots_used_from_placed_orders = slotsByUserId[u.id] ? slotsByUserId[u.id].size : 0;
        u.blocked_due_to_void = u.max_items_per_order === 0;
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
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw error;
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

    // Check if user already exists in database
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();

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

    // Step 2: Create user record in users table
    // If we have an Auth user ID, use it; otherwise generate a UUID (will be updated on first OAuth login)
    const userRecord = {
      ...(authUserId && { id: authUserId }), // Use Auth user ID if available
      email: normalizedEmail,
      name: userData.name || "",
      role: userData.role || "student",
      provider: "google", // They'll use Google OAuth to log in
      ...(authUserId && { provider_id: authUserId }), // Set provider_id if we have Auth user
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      // Add student-specific fields if provided
      course_year_level: userData.course_year_level || null,
      education_level: userData.education_level || null,
      student_number: userData.student_number || null,
    };

    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .upsert(userRecord, {
        onConflict: authUserId ? "id" : "email", // Use id if we have Auth user, otherwise email
      })
      .select()
      .single();

    if (dbError) {
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
      throw dbError;
    }

    // Create user_roles entry
    if (userData.role) {
      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: dbUser.id,
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
        userData.role === "system_admin") &&
      createdByUserId
    ) {
      try {
        await emailRoleAssignmentService.assignEmailRole(
          normalizedEmail,
          userData.role,
          createdByUserId
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
    // Get current user data to check if role is changing
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("email, role, is_active")
      .eq("id", userId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Check if trying to change role from system_admin to something else
    if (
      updates.role &&
      currentUser.role === "system_admin" &&
      updates.role !== "system_admin"
    ) {
      // Count how many active system admins exist
      const { count, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "system_admin")
        .eq("is_active", true);

      if (countError) {
        console.error("Error counting system admins:", countError);
        // Don't block the update if we can't count, but log the error
      } else if (count === 1) {
        // This is the last system admin, prevent role change
        throw new Error(
          "Cannot change role: This is the last remaining system admin. At least one system admin must exist."
        );
      }
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    // When admin sets/updates max_items_per_order, reset "used" and void strikes so student gets fresh slate
    if (updates.max_items_per_order !== undefined) {
      updateData.max_items_per_order_set_at = new Date().toISOString();
      updateData.unclaimed_void_count = 0;
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update user_roles if role changed
    if (updates.role) {
      // Delete old roles
      await supabase.from("user_roles").delete().eq("user_id", userId);

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

    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete a user (soft delete by setting is_active to false)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deleted user
 */
async function deleteUser(userId) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Bulk update users
 * @param {Array<string>} userIds - Array of user IDs to update
 * @param {Object} updateData - Data to update (max_items_per_order, order_lockout_period)
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

    // Prepare update object
    const updateObject = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    if (updateData.max_items_per_order !== undefined) {
      updateObject.max_items_per_order_set_at = new Date().toISOString();
      updateObject.unclaimed_void_count = 0;
    }

    // Update all users in the array
    const { data, error } = await supabase
      .from("users")
      .update(updateObject)
      .in("id", userIds)
      .select();

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
