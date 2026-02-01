const express = require("express");
const router = express.Router();
const userController = require("../../controllers/system_admin/user.controller");
const { verifyToken, requireSystemAdmin } = require("../../middleware/auth");

// All routes require authentication and system admin role
router.use(verifyToken);
router.use(requireSystemAdmin);

// Get all users with pagination and filters
router.get("/", userController.getUsers);

// Get a single user by ID
router.get("/:id", userController.getUserById);

// Create a new user
router.post("/", userController.createUser);

// Update a user
router.put("/:id", userController.updateUser);

// Delete a user (hard delete)
router.delete("/:id", userController.deleteUser);

// Bulk update users
router.patch("/bulk-update", userController.bulkUpdateUsers);

module.exports = router;

