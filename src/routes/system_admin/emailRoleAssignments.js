const express = require("express");
const router = express.Router();
const emailRoleAssignmentController = require("../../controllers/system_admin/emailRoleAssignment.controller");
const { verifyToken, requireSystemAdmin } = require("../../middleware/auth");

// All routes require authentication and system admin role
router.use(verifyToken);
router.use(requireSystemAdmin);

// Assign a role to an email address
router.post("/", emailRoleAssignmentController.assignEmailRole);

// Get all email role assignments with pagination and filters
router.get("/", emailRoleAssignmentController.getAllAssignments);

// Get role assignment for a specific email
router.get("/:email", emailRoleAssignmentController.getEmailRoleAssignment);

// Update role for an email address
router.put("/:email", emailRoleAssignmentController.updateEmailRole);

// Remove email role assignment
router.delete("/:email", emailRoleAssignmentController.removeEmailRoleAssignment);

module.exports = router;

