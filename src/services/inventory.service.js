const supabase = require("../config/supabase");
const NotificationService = require("./notification.service");

/**
 * Inventory Service
 *
 * Handles all business logic for inventory management including:
 * - CRUD operations for inventory items
 * - Stock adjustments
 * - Statistics calculations
 * - Low stock alerts
 * - Status calculations (handled by database triggers)
 * - Restock notifications for pre-orders
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
   * @param {Object} io - Socket.IO instance (optional)
   * @returns {Promise<Object>} - Created item with notification info
   */
  async createInventoryItem(itemData, io = null) {
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

      // Check if this new item should trigger restock notifications
      // Trigger notifications if the new item has stock > 0
      let notificationInfo = { notified: 0 };

      if (data.stock > 0) {
        notificationInfo = await this.handleRestockNotifications(data, io);
      }

      return {
        success: true,
        data,
        message: "Inventory item created successfully",
        notificationInfo,
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
   * @param {Object} io - Socket.IO instance (optional)
   * @returns {Promise<Object>} - Updated item with notification info
   */
  async updateInventoryItem(id, updates, io = null) {
    try {
      // Get current item to check for stock changes
      const { data: currentItem, error: fetchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Inventory item not found");

      // Check if this is a restock (stock going from 0 or low to positive)
      const wasOutOfStock = currentItem.stock === 0 || currentItem.status === 'Out of Stock';
      const newStock = updates.stock !== undefined ? updates.stock : currentItem.stock;
      const isRestocked = wasOutOfStock && newStock > 0;

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

      // If item was restocked, check for pending pre-orders and notify students
      let notificationInfo = null;
      if (isRestocked) {
        console.log(`📦 Item restocked: ${data.name} (${data.education_level})`);
        notificationInfo = await this.handleRestockNotifications(data, io);
      }

      return {
        success: true,
        data,
        message: "Inventory item updated successfully",
        notificationInfo,
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
   * @param {Object} io - Socket.IO instance (optional)
   * @returns {Promise<Object>} - Updated item with notification info
   */
  async adjustInventoryStock(id, adjustment, reason = "", io = null) {
    try {
      // Get current item
      const { data: currentItem, error: fetchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Inventory item not found");

      // Check if this is a restock (stock going from 0 to positive)
      const wasOutOfStock = currentItem.stock === 0 || currentItem.status === 'Out of Stock';
      const newStock = Math.max(0, currentItem.stock + adjustment);
      const isRestocked = wasOutOfStock && newStock > 0;

      // Update stock (status will be automatically recalculated by trigger)
      const { data, error } = await supabase
        .from("inventory")
        .update({ stock: newStock })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // If item was restocked, check for pending pre-orders and notify students
      let notificationInfo = null;
      if (isRestocked) {
        console.log(`📦 Item restocked via adjustment: ${data.name} (${data.education_level})`);
        notificationInfo = await this.handleRestockNotifications(data, io);
      }

      return {
        success: true,
        data,
        message: `Stock adjusted successfully. ${reason}`,
        notificationInfo,
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

  /**
   * Handle restock notifications for pre-orders
   * @param {Object} inventoryItem - The restocked inventory item
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>} - Notification results
   */
  async handleRestockNotifications(inventoryItem, io = null) {
    try {
      console.log(`🔔 Checking for pre-orders to notify for: ${inventoryItem.name}`);

      // Find students with pending pre-orders for this item
      const studentsWithPreOrders = await NotificationService.findStudentsWithPendingPreOrders(
        inventoryItem.name,
        inventoryItem.education_level,
        inventoryItem.size || null
      );

      if (studentsWithPreOrders.length === 0) {
        console.log("ℹ️ No students to notify");
        return {
          notified: 0,
          students: [],
        };
      }

      console.log(`📧 Notifying ${studentsWithPreOrders.length} students...`);

      const notificationResults = [];

      // Create notifications and emit Socket.IO events for each student
      for (const student of studentsWithPreOrders) {
        try {
          // Create notification in database
          const notification = await NotificationService.createRestockNotification({
            studentId: student.studentId,
            itemName: inventoryItem.name,
            educationLevel: inventoryItem.education_level,
            size: student.item.size || null,
            orderNumber: student.orderNumber,
            inventoryId: inventoryItem.id,
          });

          // Emit Socket.IO event for real-time notification
          if (io) {
            io.emit("inventory:restocked", {
              userId: student.studentId,
              notification: notification.data,
              item: {
                id: inventoryItem.id,
                name: inventoryItem.name,
                educationLevel: inventoryItem.education_level,
                size: student.item.size || null,
                stock: inventoryItem.stock,
              },
              order: {
                id: student.orderId,
                orderNumber: student.orderNumber,
              },
            });

            console.log(`📡 Socket.IO: Emitted inventory:restocked to student ${student.studentId}`);
          }

          notificationResults.push({
            studentId: student.studentId,
            studentName: student.studentName,
            orderNumber: student.orderNumber,
            success: true,
          });
        } catch (error) {
          console.error(`Failed to notify student ${student.studentId}:`, error);
          notificationResults.push({
            studentId: student.studentId,
            studentName: student.studentName,
            orderNumber: student.orderNumber,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = notificationResults.filter((r) => r.success).length;
      console.log(`✅ Successfully notified ${successCount}/${studentsWithPreOrders.length} students`);

      return {
        notified: successCount,
        total: studentsWithPreOrders.length,
        students: notificationResults,
      };
    } catch (error) {
      console.error("Handle restock notifications error:", error);
      return {
        notified: 0,
        total: 0,
        students: [],
        error: error.message,
      };
    }
  }
}

module.exports = new InventoryService();
