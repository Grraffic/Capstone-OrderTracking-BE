const supabase = require("../../config/supabase");
const emailRoleAssignmentService = require("./emailRoleAssignment.service");

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
 * @returns {Promise<Object>} Users data with pagination info
 */
async function getUsers({
  page = 1,
  limit = 10,
  search = "",
  role = "",
  status = "",
}) {
  try {
    let query = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply role filter
    if (role && role !== "All Roles") {
      query = query.eq("role", role);
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

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data || [],
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

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
