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

    const result = await userService.getUsers({
      page,
      limit,
      search,
      role,
      status,
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
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
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

