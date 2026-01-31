const userService = require("../../services/system_admin/user.service");

/**
 * User Controller
 * 
 * Handles HTTP requests for user management
 */

/**
 * Get all users with pagination and filters
 * GET /api/users
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";
    // Handle education_level: if undefined, null, or empty string, use empty string (means "show all")
    // Empty string from "All Education Levels" means "show all" (no filter applied)
    // Express may parse empty query params as undefined or empty string, so handle both
    let education_level = "";
    if (req.query.education_level !== undefined && req.query.education_level !== null) {
      const rawValue = String(req.query.education_level);
      education_level = rawValue.trim(); // Trim whitespace
    }
    
    // Handle course_year_level: if undefined, null, or empty string, use empty string (means "show all")
    let course_year_level = "";
    if (req.query.course_year_level !== undefined && req.query.course_year_level !== null) {
      const rawValue = String(req.query.course_year_level);
      course_year_level = rawValue.trim(); // Trim whitespace
    }
    
    // Handle school_year: 2-digit year prefix for filtering student_number (e.g., "29" from "S.Y. 2029 - 2030")
    let school_year = "";
    if (req.query.school_year !== undefined && req.query.school_year !== null) {
      const rawValue = String(req.query.school_year);
      school_year = rawValue.trim(); // Trim whitespace
    }
    
    // Handle excludeRole: exclude specific roles (e.g., "student" to exclude all students)
    let excludeRole = "";
    if (req.query.excludeRole !== undefined && req.query.excludeRole !== null) {
      const rawValue = String(req.query.excludeRole);
      excludeRole = rawValue.trim(); // Trim whitespace
    }

    // Debug logging
    console.log(`[getUsers Controller] Received params:`, {
      raw_education_level: req.query.education_level,
      processed_education_level: education_level,
      is_empty: education_level === "",
      raw_course_year_level: req.query.course_year_level,
      processed_course_year_level: course_year_level,
      raw_school_year: req.query.school_year,
      processed_school_year: school_year,
      raw_excludeRole: req.query.excludeRole,
      processed_excludeRole: excludeRole,
      role: req.query.role
    });

    const result = await userService.getUsers({
      page,
      limit,
      search,
      role,
      status,
      education_level,
      course_year_level,
      school_year,
      excludeRole,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error in getUsers controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * Get a single user by ID
 * GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if this is the last system admin (for frontend validation)
    let isLastSystemAdmin = false;
    if (user.role === "system_admin" && user.is_active) {
      const supabase = require("../../config/supabase");
      const { count, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "system_admin")
        .eq("is_active", true);

      if (!countError && count === 1) {
        isLastSystemAdmin = true;
      }
    }

    return res.json({
      success: true,
      data: {
        ...user,
        isLastSystemAdmin, // Include flag for frontend
      },
    });
  } catch (error) {
    console.error("Error in getUserById controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

/**
 * Create a new user
 * POST /api/users
 */
exports.createUser = async (req, res) => {
  try {
    const userData = req.body;

    // Validate required fields
    if (!userData.email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!userData.role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const createdByUserId = req.user?.id; // Get authenticated user ID for email_role_assignments
    const user = await userService.createUser(userData, createdByUserId);

    return res.status(201).json({
      success: true,
      data: user,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error in createUser controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

/**
 * Update a user
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedByUserId = req.user?.id; // Get authenticated user ID for email_role_assignments

    // Log incoming request for debugging
    console.log(`Update user request: userId=${id}, updates=`, JSON.stringify(updates, null, 2));

    // Don't allow updating email (it's the unique identifier)
    delete updates.email;

    const user = await userService.updateUser(id, updates, updatedByUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error in updateUser controller:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.details,
        hint: error.hint,
        stack: error.stack 
      }),
    });
  }
};

/**
 * Delete a user (soft delete)
 * DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.deleteUser(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteUser controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

/**
 * Bulk update users
 * PATCH /api/users/bulk-update
 */
exports.bulkUpdateUsers = async (req, res) => {
  try {
    const { userIds, updateData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required",
      });
    }

    // Validate updateData fields
    const allowedFields = ["total_item_limit", "order_lockout_period", "order_lockout_unit"];
    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter((field) => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid update fields: ${invalidFields.join(", ")}`,
      });
    }

    const result = await userService.bulkUpdateUsers(userIds, updateData);

    return res.json({
      success: true,
      data: result,
      message: `Successfully updated ${result.updatedCount} user(s)`,
    });
  } catch (error) {
    console.error("Error in bulkUpdateUsers controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk update users",
      error: error.message,
    });
  }
};

