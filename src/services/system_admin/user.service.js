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
async function getUsers({ page = 1, limit = 10, search = "", role = "", status = "" }) {
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
 * @returns {Promise<Object>} Created user
 */
async function createUser(userData) {
  try {
    // Insert user directly into users table
    const { data, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create user_roles entry
    if (userData.role) {
      await supabase
        .from("user_roles")
        .upsert({
          user_id: data.id,
          role: userData.role,
        }, {
          onConflict: "user_id,role",
        });
    }

    return data;
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
    if (updates.role && currentUser.role === "system_admin" && updates.role !== "system_admin") {
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
        throw new Error("Cannot change role: This is the last remaining system admin. At least one system admin must exist.");
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
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: updates.role,
        });

      // Sync email_role_assignments table to prevent role reversion
      // This is critical because passport.js checks email_role_assignments on login
      const normalizedEmail = currentUser.email?.toLowerCase().trim();
      
      if (normalizedEmail) {
        if (updates.role === "property_custodian" || updates.role === "system_admin") {
          // Create or update email_role_assignments entry
          try {
            // Check if assignment exists
            const existingAssignment = await emailRoleAssignmentService.getEmailRoleAssignment(normalizedEmail);
            
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
            console.warn("Warning: Failed to sync email_role_assignments:", assignmentError.message);
          }
        } else if (updates.role === "student") {
          // Remove from email_role_assignments if role changed to student
          try {
            // Check if assignment exists before trying to remove
            const existingAssignment = await emailRoleAssignmentService.getEmailRoleAssignment(normalizedEmail);
            if (existingAssignment) {
              await emailRoleAssignmentService.removeEmailRoleAssignment(normalizedEmail);
            }
          } catch (assignmentError) {
            // Log but don't fail if removal fails (might not exist)
            if (assignmentError.message !== "Email role assignment not found") {
              console.warn("Warning: Failed to remove email_role_assignments:", assignmentError.message);
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

