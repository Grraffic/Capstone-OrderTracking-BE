const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
// const auth = require("../middleware/auth"); // Uncomment when auth middleware is ready

/**
 * Inventory Routes
 *
 * All routes for inventory management.
 * Note: Add authentication middleware when ready for production.
 */

// ============================================================================
// STATISTICS & REPORTS (Place before :id routes to avoid conflicts)
// ============================================================================

/**
 * GET /api/inventory/stats
 * Get inventory statistics by status category
 */
router.get("/stats", inventoryController.getInventoryStats);

/**
 * GET /api/inventory/low-stock
 * Get items with Critical or At Reorder Point status
 */
router.get("/low-stock", inventoryController.getLowStockItems);

/**
 * GET /api/inventory/sizes/:name/:educationLevel
 * Get available sizes for a product by name and education level
 */
router.get("/sizes/:name/:educationLevel", inventoryController.getAvailableSizes);

/**
 * POST /api/inventory/upload-image
 * Upload an inventory image to Cloudinary and return its URL
 */
router.post("/upload-image", inventoryController.uploadInventoryImage);

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/inventory
 * Get all inventory items with optional filtering and pagination
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
router.get("/", inventoryController.getInventoryItems);

/**
 * GET /api/inventory/:id
 * Get single inventory item by ID
 */
router.get("/:id", inventoryController.getInventoryItemById);

/**
 * GET /api/inventory/:id/pre-order-count
 * Get pending pre-order count for an inventory item
 */
router.get("/:id/pre-order-count", inventoryController.getPreOrderCount);

/**
 * POST /api/inventory
 * Create new inventory item
 * Note: Add auth.requireAdmin middleware when ready
 */
router.post("/", inventoryController.createInventoryItem);

/**
 * PUT /api/inventory/:id
 * Update existing inventory item
 * Note: Add auth.requireAdmin middleware when ready
 */
router.put("/:id", inventoryController.updateInventoryItem);

/**
 * PATCH /api/inventory/:id/adjust
 * Adjust inventory stock quantity
 * Note: Add auth.requireAdmin middleware when ready
 */
router.patch("/:id/adjust", inventoryController.adjustInventoryStock);

/**
 * DELETE /api/inventory/:id
 * Delete inventory item (soft delete)
 * Note: Add auth.requireAdmin middleware when ready
 */
router.delete("/:id", inventoryController.deleteInventoryItem);

module.exports = router;

