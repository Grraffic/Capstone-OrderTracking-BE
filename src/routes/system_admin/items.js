const express = require("express");
const router = express.Router();
const itemsController = require("../../controllers/system_admin/items.controller");
const { verifyToken, requireSystemAdmin } = require("../../middleware/auth");

// All routes require authentication and system admin role
router.use(verifyToken);
router.use(requireSystemAdmin);

// Get items (with optional filters)
router.get("/", itemsController.getItems.bind(itemsController));

// Get approval statistics
router.get("/stats", itemsController.getApprovalStats.bind(itemsController));

// Approve a single item
router.post("/:id/approve", itemsController.approveItem.bind(itemsController));

// Approve multiple items
router.post("/approve", itemsController.approveItems.bind(itemsController));

// Reject an item (set back to pending)
router.post("/:id/reject", itemsController.rejectItem.bind(itemsController));

// Promote an item's name into curated suggestions
// POST /api/system-admin/items/:id/promote-name
router.post(
  "/:id/promote-name",
  itemsController.promoteItemNameToSuggestions.bind(itemsController)
);

module.exports = router;
