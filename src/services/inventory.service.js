const supabase = require("../config/supabase");

/**
 * Inventory Service
 *
 * Handles all business logic for inventory management including:
 * - CRUD operations for inventory items
 * - Stock adjustments
 * - Statistics calculations
 * - Low stock alerts
 * - Status calculations (handled by database triggers)
 */
class InventoryService {
  /**
   * Get all inventory items with optional filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} - Paginated inventory items
   */
  async getInventoryItems(filters = {}, page = 1, limit = 10) {
    try {
      let query = supabase
        .from("inventory")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      // Apply filters
      if (filters.educationLevel) {
        query = query.eq("education_level", filters.educationLevel);
      }
      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.itemType) {
        query = query.eq("item_type", filters.itemType);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,category.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created_at descending
      query = query.order("created_at", { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error("Get inventory items error:", error);
      throw new Error(`Failed to fetch inventory items: ${error.message}`);
    }
  }

  /**
   * Get single inventory item by ID
   * @param {string} id - Item ID
   * @returns {Promise<Object>} - Inventory item
   */
  async getInventoryItemById(id) {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Inventory item not found");

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Get inventory item by ID error:", error);
      throw new Error(`Failed to fetch inventory item: ${error.message}`);
    }
  }

  /**
   * Create new inventory item
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} - Created item
   */
  async createInventoryItem(itemData) {
    try {
      // Validate required fields
      const requiredFields = [
        "name",
        "education_level",
        "category",
        "item_type",
        "stock",
        "price",
      ];
      for (const field of requiredFields) {
        if (!itemData[field] && itemData[field] !== 0) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Status will be automatically calculated by the database trigger
      const { data, error } = await supabase
        .from("inventory")
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: "Inventory item created successfully",
      };
    } catch (error) {
      console.error("Create inventory item error:", error);
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }
  }

  /**
   * Update existing inventory item
   * @param {string} id - Item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated item
   */
  async updateInventoryItem(id, updates) {
    try {
      // Remove fields that shouldn't be updated directly
      const { id: _, created_at, ...allowedUpdates } = updates;

      // Status will be automatically recalculated by the database trigger if stock changes
      const { data, error } = await supabase
        .from("inventory")
        .update(allowedUpdates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Inventory item not found");

      return {
        success: true,
        data,
        message: "Inventory item updated successfully",
      };
    } catch (error) {
      console.error("Update inventory item error:", error);
      throw new Error(`Failed to update inventory item: ${error.message}`);
    }
  }

  /**
   * Delete inventory item (soft delete)
   * @param {string} id - Item ID
   * @returns {Promise<Object>} - Success message
   */
  async deleteInventoryItem(id) {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Inventory item not found");

      return {
        success: true,
        message: "Inventory item deleted successfully",
      };
    } catch (error) {
      console.error("Delete inventory item error:", error);
      throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
  }

  /**
   * Adjust inventory stock
   * @param {string} id - Item ID
   * @param {number} adjustment - Stock adjustment amount (positive or negative)
   * @param {string} reason - Reason for adjustment
   * @returns {Promise<Object>} - Updated item
   */
  async adjustInventoryStock(id, adjustment, reason = "") {
    try {
      // Get current item
      const { data: currentItem, error: fetchError } = await supabase
        .from("inventory")
        .select("stock")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Inventory item not found");

      // Calculate new stock
      const newStock = Math.max(0, currentItem.stock + adjustment);

      // Update stock (status will be automatically recalculated by trigger)
      const { data, error } = await supabase
        .from("inventory")
        .update({ stock: newStock })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Stock adjusted successfully. ${reason}`,
      };
    } catch (error) {
      console.error("Adjust inventory stock error:", error);
      throw new Error(`Failed to adjust inventory stock: ${error.message}`);
    }
  }

  /**
   * Get inventory statistics
   * @returns {Promise<Object>} - Statistics by status category
   */
  async getInventoryStats() {
    try {
      const { data, error } = await supabase.rpc("get_inventory_stats");

      if (error) throw error;

      return {
        success: true,
        data: data[0] || {
          total_items: 0,
          above_threshold_items: 0,
          at_reorder_point_items: 0,
          critical_items: 0,
          out_of_stock_items: 0,
          total_value: 0,
        },
      };
    } catch (error) {
      console.error("Get inventory stats error:", error);
      throw new Error(`Failed to fetch inventory statistics: ${error.message}`);
    }
  }

  /**
   * Get low stock items (Critical and At Reorder Point)
   * @returns {Promise<Object>} - Low stock items
   */
  async getLowStockItems() {
    try {
      const { data, error } = await supabase.rpc("get_low_stock_items");

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error("Get low stock items error:", error);
      throw new Error(`Failed to fetch low stock items: ${error.message}`);
    }
  }
}

module.exports = new InventoryService();
