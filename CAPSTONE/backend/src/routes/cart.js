const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");

/**
 * Cart Routes
 * Base path: /api/cart
 *
 * All routes handle shopping cart operations for students
 */

// ============================================================================
// CART OPERATIONS
// ============================================================================

/**
 * GET /api/cart/count/:userId
 * Get cart item count for a user
 */
router.get("/count/:userId", cartController.getCartCount);

/**
 * GET /api/cart/:userId
 * Get all cart items for a user with inventory details
 */
router.get("/:userId", cartController.getCartItems);

/**
 * POST /api/cart
 * Add item to cart (or update quantity if exists)
 *
 * Request Body:
 * {
 *   userId: string,
 *   inventoryId: string,
 *   size: string,
 *   quantity: number
 * }
 */
router.post("/", cartController.addToCart);

/**
 * PUT /api/cart/:cartItemId
 * Update cart item quantity
 *
 * Request Body:
 * {
 *   userId: string,
 *   quantity: number
 * }
 */
router.put("/:cartItemId", cartController.updateCartItem);

/**
 * DELETE /api/cart/:cartItemId
 * Remove item from cart
 *
 * Query Parameters:
 * - userId: string
 */
router.delete("/:cartItemId", cartController.removeFromCart);

/**
 * DELETE /api/cart/clear/:userId
 * Clear entire cart for a user
 */
router.delete("/clear/:userId", cartController.clearCart);

module.exports = router;

