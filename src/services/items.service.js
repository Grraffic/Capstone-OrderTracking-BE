const supabase = require("../config/supabase");
const NotificationService = require("./notification.service");

/**
 * Items Service
 *
 * Handles all business logic for items management including:
 * - CRUD operations for items
 * - Stock adjustments
 * - Statistics calculations
 * - Low stock alerts
 * - Status calculations (handled by database triggers)
 * - Restock notifications for pre-orders
 */
class ItemsService {
  /**
   * Get all items with optional filtering and pagination
   */
  async getItems(filters = {}, page = 1, limit = 10) {
    try {
      let query = supabase
        .from("items")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      if (filters.educationLevel)
        query = query.eq("education_level", filters.educationLevel);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.itemType) query = query.eq("item_type", filters.itemType);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,category.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const from = (page - 1) * limit;
      query = query
        .range(from, from + limit - 1)
        .order("created_at", { ascending: false });

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
      console.error("Get items error:", error);
      throw new Error(`Failed to fetch items: ${error.message}`);
    }
  }

  /**
   * Get single item by ID
   */
  async getItemById(id) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Item not found");
      return { success: true, data };
    } catch (error) {
      console.error("Get item by ID error:", error);
      throw new Error(`Failed to fetch item: ${error.message}`);
    }
  }

  /**
   * Create new item
   */
  async createItem(itemData, io = null) {
    try {
      const requiredFields = [
        "name",
        "education_level",
        "category",
        "item_type",
        "stock",
        "price",
      ];
      for (const field of requiredFields) {
        if (!itemData[field] && itemData[field] !== 0)
          throw new Error(`Missing required field: ${field}`);
      }

      if (
        itemData.image &&
        typeof itemData.image === "string" &&
        itemData.image.startsWith("data:")
      ) {
        console.warn(
          "Received base64 image. Expected a URL. Using default image."
        );
        itemData.image = "/assets/image/card1.png";
      }

      const { data, error } = await supabase
        .from("items")
        .insert([itemData])
        .select()
        .single();
      if (error) throw error;

      let notificationInfo = { notified: 0 };
      if (data.stock > 0)
        notificationInfo = await this.handleRestockNotifications(data, io);

      return {
        success: true,
        data,
        message: "Item created successfully",
        notificationInfo,
      };
    } catch (error) {
      console.error("Create item error:", error);
      throw new Error(`Failed to create item: ${error.message}`);
    }
  }

  /**
   * Update existing item
   */
  async updateItem(id, updates, io = null) {
    try {
      const { data: currentItem, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Item not found");

      if (
        updates.image &&
        typeof updates.image === "string" &&
        updates.image.startsWith("data:")
      ) {
        console.warn(
          "Received base64 image. Expected a URL. Using default image."
        );
        updates.image = "/assets/image/card1.png";
      }

      const wasOutOfStock =
        currentItem.stock === 0 || currentItem.status === "Out of Stock";
      const newStock =
        updates.stock !== undefined ? updates.stock : currentItem.stock;
      const isRestocked = wasOutOfStock && newStock > 0;

      const { id: _, created_at, ...allowedUpdates } = updates;
      const { data, error } = await supabase
        .from("items")
        .update(allowedUpdates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Item not found");

      let notificationInfo = null;
      if (isRestocked) {
        console.log(
          `📦 Item restocked: ${data.name} (${data.education_level})`
        );
        notificationInfo = await this.handleRestockNotifications(data, io);
      }

      return {
        success: true,
        data,
        message: "Item updated successfully",
        notificationInfo,
      };
    } catch (error) {
      console.error("Update item error:", error);
      throw new Error(`Failed to update item: ${error.message}`);
    }
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(id) {
    try {
      const { data, error } = await supabase
        .from("items")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Item not found");
      return { success: true, message: "Item deleted successfully" };
    } catch (error) {
      console.error("Delete item error:", error);
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  /**
   * Adjust item stock
   */
  async adjustStock(id, adjustment, reason = "", io = null) {
    try {
      const { data: currentItem, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Item not found");

      const wasOutOfStock =
        currentItem.stock === 0 || currentItem.status === "Out of Stock";
      const newStock = Math.max(0, currentItem.stock + adjustment);
      const isRestocked = wasOutOfStock && newStock > 0;

      const { data, error } = await supabase
        .from("items")
        .update({ stock: newStock })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      let notificationInfo = null;
      if (isRestocked) {
        console.log(
          `📦 Item restocked via adjustment: ${data.name} (${data.education_level})`
        );
        notificationInfo = await this.handleRestockNotifications(data, io);
      }

      return {
        success: true,
        data,
        message: `Stock adjusted successfully. ${reason}`,
        notificationInfo,
      };
    } catch (error) {
      console.error("Adjust stock error:", error);
      throw new Error(`Failed to adjust stock: ${error.message}`);
    }
  }

  /**
   * Get items statistics
   */
  async getStats() {
    try {
      const { data, error } = await supabase.rpc("get_items_stats");
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
      console.error("Get items stats error:", error);
      throw new Error(`Failed to fetch items statistics: ${error.message}`);
    }
  }

  /**
   * Get low stock items (Critical and At Reorder Point)
   */
  async getLowStockItems() {
    try {
      const { data, error } = await supabase.rpc("get_low_stock_items");
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Get low stock items error:", error);
      throw new Error(`Failed to fetch low stock items: ${error.message}`);
    }
  }

  /**
   * Get available sizes for a product by name and education level
   */
  async getAvailableSizes(name, educationLevel) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("size, stock, status, id")
        .eq("name", name)
        .eq("education_level", educationLevel)
        .eq("is_active", true)
        .order("size", { ascending: true });

      if (error) throw error;

      const sizeMap = new Map();
      (data || []).forEach((item) => {
        if (item.size === "N/A") return;
        if (sizeMap.has(item.size)) {
          const existing = sizeMap.get(item.size);
          existing.stock += item.stock;
          if (existing.stock === 0) existing.status = "Out of Stock";
          else if (existing.stock <= 10) existing.status = "Critical";
          else if (existing.stock <= 20) existing.status = "At Reorder Point";
          else existing.status = "Above Threshold";
        } else {
          sizeMap.set(item.size, {
            size: item.size,
            stock: item.stock,
            status: item.status,
            id: item.id,
          });
        }
      });

      const sizes = Array.from(sizeMap.values()).map((item) => ({
        ...item,
        available: item.stock > 0,
        isPreOrder: item.stock === 0,
      }));

      return { success: true, data: sizes };
    } catch (error) {
      console.error("Get available sizes error:", error);
      throw new Error(`Failed to fetch available sizes: ${error.message}`);
    }
  }

  /**
   * Handle restock notifications for pre-orders
   */
  async handleRestockNotifications(item, io = null) {
    try {
      console.log(`🔔 Checking for pre-orders to notify for: ${item.name}`);

      const studentsWithPreOrders =
        await NotificationService.findStudentsWithPendingPreOrders(
          item.name,
          item.education_level,
          item.size || null
        );

      if (studentsWithPreOrders.length === 0) {
        console.log("ℹ️ No students to notify");
        return { notified: 0, students: [] };
      }

      console.log(`📧 Notifying ${studentsWithPreOrders.length} students...`);
      const notificationResults = [];

      for (const student of studentsWithPreOrders) {
        try {
          const notification =
            await NotificationService.createRestockNotification({
              studentId: student.studentId,
              itemName: item.name,
              educationLevel: item.education_level,
              size: student.item.size || null,
              orderNumber: student.orderNumber,
              inventoryId: item.id,
            });

          if (io) {
            io.emit("items:restocked", {
              userId: student.studentId,
              notification: notification.data,
              item: {
                id: item.id,
                name: item.name,
                educationLevel: item.education_level,
                size: student.item.size || null,
                stock: item.stock,
              },
              order: { id: student.orderId, orderNumber: student.orderNumber },
            });
            console.log(
              `📡 Socket.IO: Emitted items:restocked to student ${student.studentId}`
            );
          }

          notificationResults.push({
            studentId: student.studentId,
            studentName: student.studentName,
            orderNumber: student.orderNumber,
            success: true,
          });
        } catch (error) {
          console.error(
            `Failed to notify student ${student.studentId}:`,
            error
          );
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
      console.log(
        `✅ Successfully notified ${successCount}/${studentsWithPreOrders.length} students`
      );

      return {
        notified: successCount,
        total: studentsWithPreOrders.length,
        students: notificationResults,
      };
    } catch (error) {
      console.error("Handle restock notifications error:", error);
      return { notified: 0, total: 0, students: [], error: error.message };
    }
  }
}

module.exports = new ItemsService();
