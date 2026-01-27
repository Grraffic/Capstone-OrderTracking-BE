const express = require("express");
const router = express.Router();
const roleController = require("../../controllers/system_admin/role.controller");
const { verifyToken, requireSystemAdmin } = require("../../middleware/auth");

// All routes require authentication and system admin role
router.use(verifyToken);
router.use(requireSystemAdmin);

// Get all roles with stats
router.get("/", roleController.getAllRoles);

// Get all permissions (must come before /:role route)
router.get("/permissions", roleController.getAllPermissions);

// Get role details
router.get("/:role", roleController.getRoleDetails);

// Get permissions for a role
router.get("/:role/permissions", roleController.getRolePermissions);

// Assign permission to role
router.post("/:role/permissions", roleController.assignPermission);

// Remove permission from role
router.delete("/:role/permissions/:permissionId", roleController.removePermission);

// Update role status
router.put("/:role/status", roleController.updateRoleStatus);

module.exports = router;
