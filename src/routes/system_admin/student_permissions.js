const express = require("express");
const router = express.Router();
const studentPermissionsController = require("../../controllers/system_admin/student_permissions.controller");
const { verifyToken, requireAdminOrPropertyCustodian } = require("../../middleware/auth");

/**
 * Student Permissions Routes
 * All routes require authentication and system_admin, property_custodian, or related staff roles
 */

// Apply verifyToken to all routes
router.use(verifyToken);

// Get items for permission management for a student
router.get(
  "/:studentId/items",
  requireAdminOrPropertyCustodian,
  studentPermissionsController.getItemsForStudentPermission
);

// Get all permissions for a student
router.get(
  "/:studentId",
  requireAdminOrPropertyCustodian,
  studentPermissionsController.getStudentItemPermissions
);

// Update permissions for a single student
router.post(
  "/:studentId",
  requireAdminOrPropertyCustodian,
  studentPermissionsController.updateStudentItemPermissions
);

// Bulk update permissions for multiple students
router.post(
  "/bulk",
  requireAdminOrPropertyCustodian,
  studentPermissionsController.bulkUpdateStudentItemPermissions
);

module.exports = router;
