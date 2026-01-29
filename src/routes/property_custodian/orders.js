const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/property_custodian/order.controller");
const { verifyToken } = require("../../middleware/auth");

/**
 * Orders Routes
 * Base path: /api/orders
 *
 * All routes handle order management operations
 */

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * GET /api/orders/stats
 * Get order statistics
 */
router.get("/stats", orderController.getOrderStats);

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/orders
 * Get all orders with optional filtering and pagination
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - status: Filter by status
 * - education_level: Filter by education level
 * - student_id: Filter by student ID
 * - search: Search by order number, student name, or email
 */
router.get("/", orderController.getOrders);

/**
 * GET /api/orders/number/:orderNumber
 * Get order by order number
 */
router.get("/number/:orderNumber", orderController.getOrderByNumber);

/**
 * GET /api/orders/:id
 * Get single order by ID
 */
router.get("/:id", orderController.getOrderById);

/**
 * POST /api/orders
 * Create new order (requires auth so student_id/student_email align with max-quantities)
 */
router.post("/", verifyToken, orderController.createOrder);

/**
 * PATCH /api/orders/:id/confirm
 * Student confirms order within claim window (e.g. 10 seconds) so it is not auto-voided
 */
router.patch("/:id/confirm", verifyToken, orderController.confirmOrder);

/**
 * PATCH /api/orders/:id/status
 * Update order status (requires auth; students may only cancel their own order)
 */
router.patch("/:id/status", verifyToken, orderController.updateOrderStatus);

/**
 * PUT /api/orders/:id
 * Update existing order
 * Note: Add auth middleware when ready
 */
router.put("/:id", orderController.updateOrder);

/**
 * DELETE /api/orders/:id
 * Delete order (soft delete)
 * Note: Add auth.requireAdmin middleware when ready
 */
router.delete("/:id", orderController.deleteOrder);

/**
 * POST /api/orders/:id/convert-pre-order
 * Convert pre-order to regular order (manual conversion)
 * Allows students to manually convert their pre-orders when items become available
 */
router.post("/:id/convert-pre-order", orderController.convertPreOrder);

module.exports = router;

