const emailRoleAssignmentService = require("../../services/system_admin/emailRoleAssignment.service");

/**
 * Email Role Assignment Controller
 * 
 * Handles HTTP requests for email-to-role assignment management
 * All endpoints require system_admin role
 */

/**
 * Assign a role to an email address
 * POST /api/system-admin/email-role-assignments
 */
exports.assignEmailRole = async (req, res) => {
  try {
    const { email, role } = req.body;
    const assignedByUserId = req.user?.id; // Get from authenticated user

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    if (!["property_custodian", "system_admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'property_custodian' or 'system_admin'",
      });
    }

    if (!assignedByUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const assignment = await emailRoleAssignmentService.assignEmailRole(
      email,
      role,
      assignedByUserId
    );

    return res.status(201).json({
      success: true,
      data: assignment,
      message: "Email role assigned successfully",
    });
  } catch (error) {
    console.error("Error in assignEmailRole controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign email role",
      error: error.message,
    });
  }
};

/**
 * Get all email role assignments with pagination and filters
 * GET /api/system-admin/email-role-assignments
 */
exports.getAllAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const role = req.query.role || "";

    const result = await emailRoleAssignmentService.getAllAssignments({
      page,
      limit,
      search,
      role,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error in getAllAssignments controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email role assignments",
      error: error.message,
    });
  }
};

/**
 * Get role assignment for a specific email
 * GET /api/system-admin/email-role-assignments/:email
 */
exports.getEmailRoleAssignment = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const assignment = await emailRoleAssignmentService.getEmailRoleAssignment(email);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Email role assignment not found",
      });
    }

    return res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error("Error in getEmailRoleAssignment controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch email role assignment",
      error: error.message,
    });
  }
};

/**
 * Update role for an email address
 * PUT /api/system-admin/email-role-assignments/:email
 */
exports.updateEmailRole = async (req, res) => {
  try {
    const { email } = req.params;
    const { role } = req.body;
    const updatedByUserId = req.user?.id; // Get from authenticated user

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    if (!["property_custodian", "system_admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'property_custodian' or 'system_admin'",
      });
    }

    if (!updatedByUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const assignment = await emailRoleAssignmentService.updateEmailRole(
      email,
      role,
      updatedByUserId
    );

    return res.json({
      success: true,
      data: assignment,
      message: "Email role updated successfully",
    });
  } catch (error) {
    console.error("Error in updateEmailRole controller:", error);
    
    if (error.message === "Email role assignment not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update email role",
      error: error.message,
    });
  }
};

/**
 * Remove email role assignment
 * DELETE /api/system-admin/email-role-assignments/:email
 */
exports.removeEmailRoleAssignment = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const assignment = await emailRoleAssignmentService.removeEmailRoleAssignment(email);

    return res.json({
      success: true,
      data: assignment,
      message: "Email role assignment removed successfully",
    });
  } catch (error) {
    console.error("Error in removeEmailRoleAssignment controller:", error);
    
    if (error.message === "Email role assignment not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to remove email role assignment",
      error: error.message,
    });
  }
};

