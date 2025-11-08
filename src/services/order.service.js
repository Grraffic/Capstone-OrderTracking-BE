const supabase = require("../config/supabase");

/**
 * Order Service
 * Handles all order-related database operations
 */
class OrderService {
  /**
   * Get all orders with optional filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Orders list with pagination info
   */
  async getOrders(filters = {}, page = 1, limit = 10) {
    try {
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.education_level) {
        query = query.eq("education_level", filters.education_level);
      }

      if (filters.student_id) {
        query = query.eq("student_id", filters.student_id);
      }

      if (filters.search) {
        query = query.or(
          `order_number.ilike.%${filters.search}%,student_name.ilike.%${filters.search}%,student_email.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error("Get orders error:", error);
      throw error;
    }
  }

  /**
   * Get single order by ID
   * @param {string} id - Order ID
   * @returns {Promise<Object>} - Order data
   */
  async getOrderById(id) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Get order by ID error:", error);
      throw error;
    }
  }

  /**
   * Get order by order number
   * @param {string} orderNumber - Order number
   * @returns {Promise<Object>} - Order data
   */
  async getOrderByNumber(orderNumber) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Get order by number error:", error);
      throw error;
    }
  }

  /**
   * Create new order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} - Created order
   */
  async createOrder(orderData) {
    try {
      // Validate required fields
      const requiredFields = [
        "order_number",
        "student_name",
        "student_email",
        "education_level",
        "items",
        "total_amount",
      ];

      for (const field of requiredFields) {
        if (!orderData[field] && orderData[field] !== 0) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate items array
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error("Order must contain at least one item");
      }

      // Step 1: Create the order
      const { data, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Step 2: Automatically reduce inventory for all items in the order
      const inventoryUpdates = [];
      const items = orderData.items || [];

      for (const item of items) {
        try {
          // Find inventory item by name and education level
          const { data: inventoryItems, error: searchError } = await supabase
            .from("inventory")
            .select("*")
            .ilike("name", item.name)
            .eq("education_level", orderData.education_level)
            .eq("is_active", true)
            .limit(1);

          if (searchError) {
            console.error(
              `Failed to find inventory for ${item.name}:`,
              searchError
            );
            continue;
          }

          if (!inventoryItems || inventoryItems.length === 0) {
            console.error(`Inventory item not found: ${item.name}`);
            continue;
          }

          const inventoryItem = inventoryItems[0];

          // Calculate new stock (reduce by ordered quantity)
          const newStock = Math.max(0, inventoryItem.stock - item.quantity);

          // Update inventory stock
          const { data: updatedItem, error: updateError } = await supabase
            .from("inventory")
            .update({ stock: newStock })
            .eq("id", inventoryItem.id)
            .select()
            .single();

          if (updateError) {
            console.error(
              `Failed to update inventory for ${item.name}:`,
              updateError
            );
            continue;
          }

          inventoryUpdates.push({
            item: item.name,
            quantity: item.quantity,
            previousStock: inventoryItem.stock,
            newStock: newStock,
            success: true,
          });

          console.log(
            `Inventory reduced: ${item.name} from ${inventoryItem.stock} to ${newStock} (ordered: ${item.quantity})`
          );
        } catch (itemError) {
          console.error(`Error processing item ${item.name}:`, itemError);
          inventoryUpdates.push({
            item: item.name,
            quantity: item.quantity,
            success: false,
            error: itemError.message,
          });
        }
      }

      return {
        success: true,
        data,
        inventoryUpdates,
        message: "Order created successfully and inventory updated",
      };
    } catch (error) {
      console.error("Create order error:", error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} id - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(id, status) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add timestamp for specific status changes
      if (status === "paid") {
        updates.payment_date = new Date().toISOString();
      } else if (status === "claimed") {
        updates.claimed_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        data,
        message: "Order status updated successfully",
      };
    } catch (error) {
      console.error("Update order status error:", error);
      throw error;
    }
  }

  /**
   * Update order
   * @param {string} id - Order ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrder(id, updates) {
    try {
      // Remove fields that shouldn't be updated directly
      const { id: _, created_at, ...allowedUpdates } = updates;
      allowedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("orders")
        .update(allowedUpdates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        data,
        message: "Order updated successfully",
      };
    } catch (error) {
      console.error("Update order error:", error);
      throw error;
    }
  }

  /**
   * Delete order (soft delete)
   * @param {string} id - Order ID
   * @returns {Promise<Object>} - Success message
   */
  async deleteOrder(id) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        message: "Order deleted successfully",
      };
    } catch (error) {
      console.error("Delete order error:", error);
      throw error;
    }
  }

  /**
   * Get order statistics
   * @returns {Promise<Object>} - Order statistics
   */
  async getOrderStats() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("status, total_amount")
        .eq("is_active", true);

      if (error) throw error;

      const stats = {
        total_orders: data.length,
        pending_orders: data.filter((o) => o.status === "pending").length,
        paid_orders: data.filter((o) => o.status === "paid").length,
        claimed_orders: data.filter((o) => o.status === "claimed").length,
        total_revenue: data.reduce(
          (sum, o) => sum + parseFloat(o.total_amount || 0),
          0
        ),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Get order stats error:", error);
      throw error;
    }
  }
}

module.exports = new OrderService();
