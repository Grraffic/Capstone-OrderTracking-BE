const express = require("express");
const router = express.Router();
const itemsController = require("../../controllers/property_custodian/items.controller");
const {
  verifyToken,
  requireAdminOrPropertyCustodian,
} = require("../../middleware/auth");

/**
 * Items Routes
 *
 * All routes for items management.
 * Note: Add authentication middleware when ready for production.
 */

// ============================================================================
// STATISTICS & REPORTS (Place before :id routes to avoid conflicts)
// ============================================================================

/**
 * GET /api/items/stats
 * Get items statistics by status category
 */
router.get("/stats", itemsController.getStats);

/**
 * GET /api/items/low-stock
 * Get items with Critical or At Reorder Point status
 */
router.get("/low-stock", itemsController.getLowStockItems);

/**
 * GET /api/items/inventory-report
 * Get full inventory report with beginning inventory, purchases, etc.
 */
router.get("/inventory-report", itemsController.getInventoryReport);

/**
 * GET /api/items/sizes/:name/:educationLevel
 * Get available sizes for a product by name and education level
 */
router.get("/sizes/:name/:educationLevel", itemsController.getAvailableSizes);

/**
 * GET /api/items/name-suggestions
 * Get curated item name suggestions (optionally filtered by education level and search term)
 *
 * Query Parameters:
 * - educationLevel: Filter suggestions by education level (also returns global suggestions)
 * - search: Search within suggestions by name (case-insensitive)
 * - limit: Max suggestions to return (default: 100, max: 500)
 */
router.get("/name-suggestions", itemsController.getNameSuggestions);

/**
 * POST /api/items/upload-image
 * Upload an item image to Cloudinary and return its URL
 */
router.post("/upload-image", itemsController.uploadItemImage);

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/items
 * Get all items with optional filtering and pagination
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - educationLevel: Filter by education level
 * - category: Filter by category
 * - itemType: Filter by item type
 * - status: Filter by status
 * - search: Search by name, category, or description
 */
router.get("/", itemsController.getItems);

/**
 * GET /api/items/:id
 * Get single item by ID
 */
router.get("/:id", itemsController.getItemById);

/**
 * GET /api/items/:id/pre-order-count
 * Get pending pre-order count for an item
 */
router.get("/:id/pre-order-count", itemsController.getPreOrderCount);

/**
 * POST /api/items
 * Create new item (staff only)
 */
router.post(
  "/",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.createItem
);

/**
 * PUT /api/items/:id
 * Update existing item (staff only)
 */
router.put(
  "/:id",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.updateItem
);

/**
 * PATCH /api/items/:id/adjust
 * Adjust item stock quantity (staff only)
 */
router.patch(
  "/:id/adjust",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.adjustStock
);

/**
 * POST /api/items/:id/add-stock
 * Add stock to item (goes to purchases) (staff only)
 */
router.post(
  "/:id/add-stock",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.addStock
);

/**
 * POST /api/items/fiscal-year-rollover
 * Perform fiscal year rollover for all items
 * Carries forward ending inventory as beginning inventory for new fiscal year
 * Body: { rolloverDate? } (optional, defaults to today)
 * Note: Add auth.requireAdmin middleware when ready
 */
router.post("/fiscal-year-rollover", itemsController.performFiscalYearRollover);

/**
 * POST /api/items/:id/record-return
 * Record a return (student returned item); appears in Returns table (staff only)
 */
router.post(
  "/:id/record-return",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.recordReturn
);

/**
 * POST /api/items/:id/return-release-check
 * Strict precheck for return validation (staff only)
 */
router.post(
  "/:id/return-release-check",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.checkReturnReleaseHistory
);

/**
 * POST /api/items/:id/reset-beginning-inventory
 * Manually reset beginning inventory (staff only)
 */
router.post(
  "/:id/reset-beginning-inventory",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.resetBeginningInventory
);

/**
 * PATCH /api/items/:id/archive
 * Archive item (hidden from default list; show when filter "Archived") (staff only)
 */
router.patch(
  "/:id/archive",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.archiveItem
);

/**
 * DELETE /api/items/:id
 * Delete item (soft delete) (staff only)
 */
router.delete(
  "/:id",
  verifyToken,
  requireAdminOrPropertyCustodian,
  itemsController.deleteItem
);

module.exports = router;

