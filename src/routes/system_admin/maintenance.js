const express = require("express");
const router = express.Router();
const maintenanceController = require("../../controllers/system_admin/maintenance.controller");
const { verifyToken, requireSystemAdmin } = require("../../middleware/auth");

// All routes require authentication and system admin role
router.use(verifyToken);
router.use(requireSystemAdmin);

// Get current maintenance mode settings
router.get("/", maintenanceController.getMaintenanceMode);

// Update maintenance mode settings
router.put("/", maintenanceController.updateMaintenanceMode);

module.exports = router;
