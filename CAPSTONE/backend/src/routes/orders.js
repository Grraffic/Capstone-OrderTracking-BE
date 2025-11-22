const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");

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
 * Create new order
 * Note: Add auth middleware when ready
 */
router.post("/", orderController.createOrder);

/**
 * PATCH /api/orders/:id/status
 * Update order status
 * Note: Add auth.requireAdmin middleware when ready
 */
router.patch("/:id/status", orderController.updateOrderStatus);

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

module.exports = router;

