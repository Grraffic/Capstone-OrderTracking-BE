const roleService = require("../../services/system_admin/role.service");
const permissionService = require("../../services/system_admin/permission.service");

/**
 * Role Controller
 * 
 * Handles HTTP requests for role management
 * All endpoints require system_admin role
 */

/**
 * Get all roles with stats
 * GET /api/system-admin/roles
 */
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();

    return res.status(200).json({
      success: true,
      data: roles,
      message: "Roles retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getAllRoles controller:", error);
    
    // Check if it's a migration error
    if (error.message && error.message.includes('Permissions system not initialized')) {
      return res.status(500).json({
        success: false,
        message: "Permissions system not initialized",
        error: error.message,
        hint: "Please run the migration: backend/migrations/create_permissions_system.sql",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve roles",
      error: error.message,
    });
  }
};

/**
 * Get role details with permissions
 * GET /api/system-admin/roles/:role
 */
exports.getRoleDetails = async (req, res) => {
  try {
    const { role } = req.params;

    const roleDetails = await roleService.getRoleDetails(role);

    return res.status(200).json({
      success: true,
      data: roleDetails,
      message: "Role details retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getRoleDetails controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve role details",
      error: error.message,
    });
  }
};

/**
 * Get permissions for a role
 * GET /api/system-admin/roles/:role/permissions
 */
exports.getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;

    const permissions = await permissionService.getPermissionsByRole(role);

    return res.status(200).json({
      success: true,
      data: permissions,
      message: "Role permissions retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getRolePermissions controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve role permissions",
      error: error.message,
    });
  }
};

/**
 * Assign permission to role
 * POST /api/system-admin/roles/:role/permissions
 */
exports.assignPermission = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      return res.status(400).json({
        success: false,
        message: "Permission ID is required",
      });
    }

    await permissionService.assignPermissionToRole(role, permissionId);

    return res.status(200).json({
      success: true,
      message: "Permission assigned successfully",
    });
  } catch (error) {
    console.error("Error in assignPermission controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign permission",
      error: error.message,
    });
  }
};

/**
 * Remove permission from role
 * DELETE /api/system-admin/roles/:role/permissions/:permissionId
 */
exports.removePermission = async (req, res) => {
  try {
    const { role, permissionId } = req.params;

    const success = await permissionService.removePermissionFromRole(role, permissionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Permission not found for this role",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Permission removed successfully",
    });
  } catch (error) {
    console.error("Error in removePermission controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove permission",
      error: error.message,
    });
  }
};

/**
 * Update role status
 * PUT /api/system-admin/roles/:role/status
 */
exports.updateRoleStatus = async (req, res) => {
  try {
    const { role } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    await roleService.updateRoleStatus(role, isActive);

    return res.status(200).json({
      success: true,
      message: "Role status updated successfully",
    });
  } catch (error) {
    console.error("Error in updateRoleStatus controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update role status",
      error: error.message,
    });
  }
};

/**
 * Get all permissions (grouped by category)
 * GET /api/system-admin/permissions
 */
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await permissionService.getAllPermissions();

    return res.status(200).json({
      success: true,
      data: permissions,
      message: "Permissions retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getAllPermissions controller:", error);
    
    // Check if it's a migration error
    if (error.message && error.message.includes('Permissions system not initialized')) {
      return res.status(500).json({
        success: false,
        message: "Permissions system not initialized",
        error: error.message,
        hint: "Please run the migration: backend/migrations/create_permissions_system.sql",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve permissions",
      error: error.message,
    });
  }
};
