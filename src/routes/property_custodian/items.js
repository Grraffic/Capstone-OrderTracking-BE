const express = require("express");
const router = express.Router();
const itemsController = require("../../controllers/property_custodian/items.controller");
// const auth = require("../middleware/auth"); // Uncomment when auth middleware is ready

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
 * Create new item
 * Note: Add auth.requireAdmin middleware when ready
 */
router.post("/", itemsController.createItem);

/**
 * PUT /api/items/:id
 * Update existing item
 * Note: Add auth.requireAdmin middleware when ready
 */
router.put("/:id", itemsController.updateItem);

/**
 * PATCH /api/items/:id/adjust
 * Adjust item stock quantity
 * Note: Add auth.requireAdmin middleware when ready
 */
router.patch("/:id/adjust", itemsController.adjustStock);

/**
 * POST /api/items/:id/add-stock
 * Add stock to item (goes to purchases)
 * Note: Add auth.requireAdmin middleware when ready
 */
router.post("/:id/add-stock", itemsController.addStock);

/**
 * POST /api/items/:id/reset-beginning-inventory
 * Manually reset beginning inventory
 * Note: Add auth.requireAdmin middleware when ready
 */
router.post("/:id/reset-beginning-inventory", itemsController.resetBeginningInventory);

/**
 * DELETE /api/items/:id
 * Delete item (soft delete)
 * Note: Add auth.requireAdmin middleware when ready
 */
router.delete("/:id", itemsController.deleteItem);

module.exports = router;

