const supabase = require("../config/supabase");

/**
 * Cart Service
 * Handles all cart-related business logic and database operations
 */
class CartService {
  /**
   * Get all cart items for a user with inventory details
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cart items with inventory details
   */
  async getCartItems(userId) {
    try {
      // First, get cart items
      const { data: cartItems, error: cartError } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (cartError) {
        throw cartError;
      }

      // If no cart items, return empty array
      if (!cartItems || cartItems.length === 0) {
        return {
          success: true,
          data: [],
          count: 0,
        };
      }

      // Get inventory IDs from cart items
      const inventoryIds = cartItems.map((item) => item.inventory_id);

      // Fetch inventory details for all items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("items")
        .select(
          "id, name, education_level, category, item_type, description, image, stock, price, note"
        )
        .in("id", inventoryIds);

      if (inventoryError) {
        throw inventoryError;
      }

      // Create a map of inventory data for quick lookup
      const inventoryMap = {};
      inventoryData.forEach((inv) => {
        inventoryMap[inv.id] = inv;
      });

      // Transform data to include inventory details with correct price for size
      const transformedData = cartItems.map((item) => {
        const inventoryItem = inventoryMap[item.inventory_id];
        let finalPrice = inventoryItem ? inventoryItem.price : 0;
        let stock = inventoryItem ? inventoryItem.stock : 0;
        
        // Check for variant price in note field
        if (inventoryItem && inventoryItem.note && item.size && item.size !== "N/A") {
          try {
             const parsedNote = JSON.parse(inventoryItem.note);
             if (parsedNote && parsedNote._type === 'sizeVariations' && Array.isArray(parsedNote.sizeVariations)) {
                // Find matching variant
                const variant = parsedNote.sizeVariations.find(v => {
                   const vSize = v.size || "";
                   return vSize === item.size || vSize.includes(item.size) || item.size.includes(vSize);
                });
                
                if (variant) {
                   finalPrice = Number(variant.price) || finalPrice;
                   stock = Number(variant.stock) || 0; // Variant stock
                }
             }
          } catch (e) {
             // Ignore parse or lookup errors
          }
        }
        
        // Override inventory fields with variant specific data if found
        const enhancedInventory = inventoryItem ? {
           ...inventoryItem,
           price: finalPrice,
           stock: stock // Show variant stock instead of total status
        } : null;

        return {
          id: item.id,
          userId: item.user_id,
          inventoryId: item.inventory_id,
          size: item.size,
          quantity: item.quantity,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          inventory: enhancedInventory,
        };
      });

      return {
        success: true,
        data: transformedData,
        count: transformedData.length,
      };
    } catch (error) {
      console.error("Get cart items error:", error);
      throw new Error(error.message || "Failed to fetch cart items");
    }
  }

  /**
   * Add item to cart or update quantity if exists
   * @param {Object} cartData - Cart item data
   * @returns {Promise<Object>} Created/updated cart item
   */
  async addToCart(cartData) {
    try {
      const { userId, inventoryId, size, quantity } = cartData;

      // Validate required fields
      if (!userId || !inventoryId || !size || !quantity) {
        throw new Error("Missing required fields");
      }

      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", userId)
        .eq("inventory_id", inventoryId)
        .eq("size", size)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected
        throw checkError;
      }

      let result;

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;
        const { data, error } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", existingItem.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new cart item
        const { data, error } = await supabase
          .from("cart_items")
          .insert([
            {
              user_id: userId,
              inventory_id: inventoryId,
              size,
              quantity,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return {
        success: true,
        data: result,
        message: existingItem
          ? "Cart item quantity updated"
          : "Item added to cart",
      };
    } catch (error) {
      console.error("Add to cart error:", error);
      throw new Error(error.message || "Failed to add item to cart");
    }
  }

  /**
   * Update cart item quantity
   * @param {string} cartItemId - Cart item ID
   * @param {string} userId - User ID (for security)
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart item
   */
  async updateCartItem(cartItemId, userId, quantity) {
    try {
      if (!cartItemId || !userId || quantity === undefined) {
        throw new Error("Missing required fields");
      }

      if (quantity < 1) {
        throw new Error("Quantity must be at least 1");
      }

      const { data, error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", cartItemId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Cart item not found or unauthorized");
      }

      return {
        success: true,
        data,
        message: "Cart item updated successfully",
      };
    } catch (error) {
      console.error("Update cart item error:", error);
      throw new Error(error.message || "Failed to update cart item");
    }
  }

  /**
   * Remove item from cart
   * @param {string} cartItemId - Cart item ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<Object>} Success message
   */
  async removeFromCart(cartItemId, userId) {
    try {
      if (!cartItemId || !userId) {
        throw new Error("Missing required fields");
      }

      const { data, error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Cart item not found or unauthorized");
      }

      return {
        success: true,
        message: "Item removed from cart",
      };
    } catch (error) {
      console.error("Remove from cart error:", error);
      throw new Error(error.message || "Failed to remove item from cart");
    }
  }

  /**
   * Clear entire cart for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message
   */
  async clearCart(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: "Cart cleared successfully",
      };
    } catch (error) {
      console.error("Clear cart error:", error);
      throw new Error(error.message || "Failed to clear cart");
    }
  }

  /**
   * Get cart item count for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Item count
   */
  async getCartCount(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const { count, error } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        count: count || 0,
      };
    } catch (error) {
      console.error("Get cart count error:", error);
      throw new Error(error.message || "Failed to get cart count");
    }
  }
}

module.exports = new CartService();
