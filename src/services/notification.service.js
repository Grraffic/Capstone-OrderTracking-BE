const supabase = require("../config/supabase");

/**
 * Notification Service
 *
 * Handles all business logic for notifications including:
 * - Finding students with pending pre-orders for restocked items
 * - Creating notification records
 * - Managing notification state
 */
class NotificationService {
  /**
   * Find students who have pre-ordered a specific inventory item
   * @param {string} itemName - Name of the inventory item
   * @param {string} educationLevel - Education level of the item
   * @param {string} size - Size of the item (optional)
   * @returns {Promise<Array>} - Array of students with pending pre-orders
   */
  async findStudentsWithPendingPreOrders(itemName, educationLevel, size = null) {
    try {
      console.log(`🔍 Finding students with pre-orders for: ${itemName} (${educationLevel}${size ? `, Size: ${size}` : ''})`);

      // Query orders table for pre-orders with matching items
      const { data: preOrders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_type", "pre-order")
        .eq("is_active", true)
        .in("status", ["pending", "processing", "payment_pending"]); // Include payment_pending

      if (error) throw error;

      if (!preOrders || preOrders.length === 0) {
        console.log("ℹ️ No pre-orders found");
        return [];
      }

      // Filter orders that contain the specific item
      const matchingOrders = preOrders.filter((order) => {
        const items = order.items || [];
        return items.some((item) => {
          const nameMatch = item.name === itemName;
          const levelMatch = item.education_level === educationLevel;
          // Enhanced size matching logic
          let sizeMatch = true;
          if (size) {
            // Normalize sizes for comparison
            const orderItemSize = (item.size || "").toLowerCase().trim();
            const restockSize = (size || "").toLowerCase().trim();
            
            // Common size aliases map
            const aliases = {
              'xs': ['xsmall', 'extra small', 'xs'],
              's': ['small', 's'],
              'm': ['medium', 'm'],
              'l': ['large', 'l'],
              'xl': ['xlarge', 'extra large', 'xl'],
              'xxl': ['2xlarge', '2xl', 'xxl', 'double extra large'],
              '3xl': ['3xlarge', '3xl', 'triple extra large']
            };

            // Check direct match
            const directMatch = orderItemSize === restockSize;

            // Check alias match
            let aliasMatch = false;
            for (const [key, values] of Object.entries(aliases)) {
              // Ensure strict matching within aliases
              // Check if BOTH the order size and restock size belong to the SAME alias group
              if (values.includes(orderItemSize) && values.includes(restockSize)) {
                aliasMatch = true;
                break;
              }
            }

            sizeMatch = directMatch || aliasMatch;
          }
          
          return nameMatch && levelMatch && sizeMatch;
        });
      });

      console.log(`✅ Found ${matchingOrders.length} students with pending pre-orders`);

      // Extract unique students with their order details
      const studentsWithOrders = matchingOrders.map((order) => {
        // Find the specific item in the order
        const matchedItem = order.items.find((item) => {
          const nameMatch = item.name === itemName;
          const levelMatch = item.education_level === educationLevel;
          // Enhanced size matching logic
          let sizeMatch = true;
          if (size) {
            const orderItemSize = (item.size || "").toLowerCase().trim();
            const restockSize = (size || "").toLowerCase().trim();
            
            const aliases = {
              'xs': ['xsmall', 'extra small', 'xs'],
              's': ['small', 's'],
              'm': ['medium', 'm'],
              'l': ['large', 'l'],
              'xl': ['xlarge', 'extra large', 'xl'],
              'xxl': ['2xlarge', '2xl', 'xxl', 'double extra large'],
              '3xl': ['3xlarge', '3xl', 'triple extra large']
            };

            const directMatch = orderItemSize === restockSize;

            let aliasMatch = false;
            for (const [key, values] of Object.entries(aliases)) {
              if (values.includes(orderItemSize) && values.includes(restockSize)) {
                aliasMatch = true;
                break;
              }
            }
            sizeMatch = directMatch || aliasMatch;
          }
          return nameMatch && levelMatch && sizeMatch;
        });

        return {
          studentId: order.student_id,
          studentName: order.student_name,
          studentEmail: order.student_email,
          orderId: order.id,
          orderNumber: order.order_number,
          item: matchedItem,
        };
      });

      return studentsWithOrders;
    } catch (error) {
      console.error("Find students with pre-orders error:", error);
      throw new Error(`Failed to find students with pre-orders: ${error.message}`);
    }
  }

  /**
   * Create notification for inventory restock
   * @param {Object} notificationData - Notification details
   * @returns {Promise<Object>} - Created notification
   */
  async createRestockNotification(notificationData) {
    try {
      const {
        studentId,
        itemName,
        educationLevel,
        size,
        orderNumber,
        inventoryId,
        orderConverted = true, // Default to true if not specified
      } = notificationData;

      // Enhanced message indicating order conversion and QR code availability
      let message;
      if (orderConverted) {
        message = size
          ? `Great news! ${itemName} (${educationLevel}, Size: ${size}) is now available. Your order #${orderNumber} has been moved to Orders and your QR code is ready for viewing!`
          : `Great news! ${itemName} (${educationLevel}) is now available. Your order #${orderNumber} has been moved to Orders and your QR code is ready for viewing!`;
      } else {
        message = size
          ? `Good news! ${itemName} (${educationLevel}, Size: ${size}) is now available for your order #${orderNumber}`
          : `Good news! ${itemName} (${educationLevel}) is now available for your order #${orderNumber}`;
      }

      const notification = {
        user_id: studentId,
        type: "restock",
        title: orderConverted
          ? "Item Available - Order Ready!"
          : "Item Back in Stock!",
        message: message,
        data: {
          itemName,
          educationLevel,
          size,
          orderNumber,
          inventoryId,
          orderConverted,
          qrCodeAvailable: orderConverted, // QR code is available if order was converted
        },
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("notifications")
        .insert([notification])
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Notification created for student ${studentId}`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Create restock notification error:", error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  /**
   * Get notifications for a specific user
   * @param {string} userId - User ID
   * @param {boolean} unreadOnly - Get only unread notifications
   * @returns {Promise<Array>} - Array of notifications
   */
  async getUserNotifications(userId, unreadOnly = false) {
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (unreadOnly) {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error("Get user notifications error:", error);
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} - Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Mark notification as read error:", error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Update result
   */
  async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .select();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Marked ${data.length} notifications as read`,
      };
    } catch (error) {
      console.error("Mark all as read error:", error);
      throw new Error(`Failed to mark all as read: ${error.message}`);
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} - Delete result
   */
  async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      return {
        success: true,
        message: "Notification deleted successfully",
      };
    } catch (error) {
      console.error("Delete notification error:", error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Count of unread notifications
   */
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      return {
        success: true,
        count: count || 0,
      };
    } catch (error) {
      console.error("Get unread count error:", error);
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();

