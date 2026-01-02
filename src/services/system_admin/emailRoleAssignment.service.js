const supabase = require("../../config/supabase");

/**
 * Email Role Assignment Service
 * 
 * Handles all database operations for email-to-role assignments
 * made by system admins
 */

/**
 * Normalize email to lowercase and trim
 * @param {string} email - Email address
 * @returns {string} Normalized email
 */
function normalizeEmail(email) {
  if (!email || typeof email !== "string") {
    return "";
  }
  return email.toLowerCase().trim();
}

/**
 * Assign a role to an email address
 * @param {string} email - Email address
 * @param {string} role - Role to assign ('property_custodian' or 'system_admin')
 * @param {string} assignedByUserId - System admin user ID who is making the assignment
 * @returns {Promise<Object>} Created assignment
 */
async function assignEmailRole(email, role, assignedByUserId) {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    if (!["property_custodian", "system_admin"].includes(role)) {
      throw new Error("Role must be 'property_custodian' or 'system_admin'");
    }

    if (!assignedByUserId) {
      throw new Error("assignedByUserId is required");
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from("email_role_assignments")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      // Update existing assignment
      const { data, error } = await supabase
        .from("email_role_assignments")
        .update({
          role,
          assigned_by: assignedByUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("email", normalizedEmail)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from("email_role_assignments")
        .insert({
          email: normalizedEmail,
          role,
          assigned_by: assignedByUserId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    }
  } catch (error) {
    console.error("Error assigning email role:", error);
    throw error;
  }
}

/**
 * Get role assignment for a specific email
 * @param {string} email - Email address
 * @returns {Promise<Object|null>} Assignment data or null if not found
 */
async function getEmailRoleAssignment(email) {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return null;
    }

    const { data, error } = await supabase
      .from("email_role_assignments")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching email role assignment:", error);
    throw error;
  }
}

/**
 * Get all email role assignments with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.search - Search term for email
 * @param {string} options.role - Filter by role
 * @returns {Promise<Object>} Assignments data with pagination info
 */
async function getAllAssignments({ page = 1, limit = 10, search = "", role = "" } = {}) {
  try {
    let query = supabase
      .from("email_role_assignments")
      .select(`
        *,
        assigned_by_user:users!email_role_assignments_assigned_by_fkey(id, email, name)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      query = query.ilike("email", `%${search}%`);
    }

    // Apply role filter
    if (role && role !== "All Roles") {
      query = query.eq("role", role);
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
    console.error("Error fetching email role assignments:", error);
    throw error;
  }
}

/**
 * Update role for an email address
 * @param {string} email - Email address
 * @param {string} newRole - New role to assign
 * @param {string} updatedByUserId - System admin user ID who is making the update
 * @returns {Promise<Object>} Updated assignment
 */
async function updateEmailRole(email, newRole, updatedByUserId) {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    if (!["property_custodian", "system_admin"].includes(newRole)) {
      throw new Error("Role must be 'property_custodian' or 'system_admin'");
    }

    if (!updatedByUserId) {
      throw new Error("updatedByUserId is required");
    }

    const { data, error } = await supabase
      .from("email_role_assignments")
      .update({
        role: newRole,
        assigned_by: updatedByUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("email", normalizedEmail)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Email role assignment not found");
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating email role:", error);
    throw error;
  }
}

/**
 * Remove email role assignment
 * @param {string} email - Email address
 * @returns {Promise<Object>} Deleted assignment
 */
async function removeEmailRoleAssignment(email) {
  try {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    // Get the assignment first to return it
    const { data: assignment } = await supabase
      .from("email_role_assignments")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (!assignment) {
      throw new Error("Email role assignment not found");
    }

    // Delete the assignment
    const { error } = await supabase
      .from("email_role_assignments")
      .delete()
      .eq("email", normalizedEmail);

    if (error) {
      throw error;
    }

    return assignment;
  } catch (error) {
    console.error("Error removing email role assignment:", error);
    throw error;
  }
}

module.exports = {
  assignEmailRole,
  getEmailRoleAssignment,
  getAllAssignments,
  updateEmailRole,
  removeEmailRoleAssignment,
  normalizeEmail,
};

