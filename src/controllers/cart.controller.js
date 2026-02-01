const CartService = require("../services/cart.service");

/**
 * Cart Controller
 * Handles HTTP requests for cart operations
 */
class CartController {
  /**
   * Get all cart items for a user
   * GET /api/cart/:userId
   * Note: Only students have carts. System admins and staff should get empty cart.
   */
  async getCartItems(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      // Check if user is a student - only students have carts
      const userRole = req.user?.role;
      if (userRole && userRole !== "student") {
        // Non-students (system_admin, property_custodian, etc.) don't have carts
        // Return empty cart instead of error
        return res.status(200).json({
          success: true,
          data: [],
          message: "Cart is empty (not a student account)",
        });
      }

      const result = await CartService.getCartItems(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Get cart items error:", {
        error: error.message,
        stack: error.stack,
        userId,
        userRole: req.user?.role,
      });
      
      // If error is about student not found, handle gracefully
      if (error.message && (
        error.message.includes("Student account not found") ||
        error.message.includes("not a student") ||
        error.message.includes("Failed to verify student account")
      )) {
        const userRole = req.user?.role;
        
        // For non-students, return empty cart
        if (userRole && userRole !== "student") {
          return res.status(200).json({
            success: true,
            data: [],
            message: "Cart is empty (not a student account)",
          });
        }
        
        // For students who can't be found, return empty cart instead of error
        // This can happen during account setup or if there's a sync issue
        console.warn("Student account not found for user:", userId);
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          message: "Cart is empty",
        });
      }
      
      // For other errors, return 500 with proper error message
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch cart items",
      });
    }
  }

  /**
   * Add item to cart
   * POST /api/cart
   *
   * Request Body:
   * {
   *   userId: string (required),
   *   inventoryId: string (required),
   *   size: string (required),
   *   quantity: number (required)
   * }
   */
  async addToCart(req, res) {
    try {
      const { userId, inventoryId, size, quantity } = req.body;
      // Get user email from JWT token if available (for fallback student lookup)
      const userEmail = req.user?.email || null;

      if (!userId || !inventoryId || !size || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: userId, inventoryId, size, quantity",
        });
      }

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1",
        });
      }

      const result = await CartService.addToCart({
        userId,
        inventoryId,
        size,
        quantity,
        userEmail, // Pass email for fallback lookup
      });

      res.status(201).json(result);
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to add item to cart",
      });
    }
  }

  /**
   * Update cart item quantity
   * PUT /api/cart/:cartItemId
   *
   * Request Body:
   * {
   *   userId: string (required),
   *   quantity: number (required)
   * }
   */
  async updateCartItem(req, res) {
    try {
      const { cartItemId } = req.params;
      const { userId, quantity } = req.body;

      if (!cartItemId || !userId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: cartItemId, userId, quantity",
        });
      }

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be at least 1",
        });
      }

      const result = await CartService.updateCartItem(
        cartItemId,
        userId,
        quantity
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Update cart item error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update cart item",
      });
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/:cartItemId
   *
   * Query Parameters:
   * - userId: string (required)
   */
  async removeFromCart(req, res) {
    try {
      const { cartItemId } = req.params;
      const { userId } = req.query;

      if (!cartItemId || !userId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: cartItemId, userId",
        });
      }

      const result = await CartService.removeFromCart(cartItemId, userId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to remove item from cart",
      });
    }
  }

  /**
   * Clear entire cart for a user
   * DELETE /api/cart/clear/:userId
   */
  async clearCart(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await CartService.clearCart(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to clear cart",
      });
    }
  }

  /**
   * Get cart item count for a user
   * GET /api/cart/count/:userId
   */
  async getCartCount(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await CartService.getCartCount(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error("Get cart count error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get cart count",
      });
    }
  }
}

module.exports = new CartController();

