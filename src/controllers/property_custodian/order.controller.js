const OrderService = require("../../services/property_custodian/order.service");

/**
 * Order Controller
 * Handles HTTP requests for order operations
 */
class OrderController {
  /**
   * Get all orders with optional filtering and pagination
   * GET /api/orders
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10)
   * - status: Filter by status
   * - education_level: Filter by education level
   * - student_id: Filter by student ID
   * - search: Search by order number, student name, or email
   */
  async getOrders(req, res) {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await OrderService.getOrders(
        filters,
        parseInt(page) || 1,
        parseInt(limit) || 10
      );
      res.json(result);
    } catch (error) {
      console.error("Get orders error:", error);

      // Check if it's a database timeout error
      const isTimeout = error.code === '57014' || error.message?.includes('timeout');
      const statusCode = isTimeout ? 504 : 500; // 504 Gateway Timeout

      res.status(statusCode).json({
        success: false,
        message: isTimeout
          ? "Database query timeout. Please try again or contact support."
          : (error.message || "Failed to fetch orders"),
        errorCode: error.code,
      });
    }
  }

  /**
   * Get single order by ID
   * GET /api/orders/:id
   */
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const result = await OrderService.getOrderById(id);
      res.json(result);
    } catch (error) {
      console.error("Get order by ID error:", error);
      res.status(404).json({
        success: false,
        message: error.message || "Order not found",
      });
    }
  }

  /**
   * Get order by order number
   * GET /api/orders/number/:orderNumber
   */
  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      const result = await OrderService.getOrderByNumber(orderNumber);
      res.json(result);
    } catch (error) {
      console.error("Get order by number error:", error);
      res.status(404).json({
        success: false,
        message: error.message || "Order not found",
      });
    }
  }

  /**
   * Create new order
   * POST /api/orders
   *
   * Request Body:
   * {
   *   order_number: string (required),
   *   student_id: string (optional),
   *   student_name: string (required),
   *   student_email: string (required),
   *   education_level: string (required),
   *   items: array (required),
   *   total_amount: number (required),
   *   qr_code_data: string (optional),
   *   notes: string (optional)
   * }
   */
  async createOrder(req, res) {
    try {
      const io = req.app.get("io");
      const result = await OrderService.createOrder(req.body, io);
      
      // Emit Socket.IO events for real-time updates
      if (io && result.success) {
        // Emit order created event
        io.emit("order:created", {
          orderId: result.data.id,
          orderNumber: result.data.order_number,
          orderType: result.data.order_type,
          studentId: result.data.student_id,
          items: result.data.items,
        });
        console.log(`📡 Socket.IO: Emitted order:created for order ${result.data.order_number}`);
        
        // Emit item:updated events for each item that had stock reduced
        if (result.inventoryUpdates && Array.isArray(result.inventoryUpdates)) {
          result.inventoryUpdates.forEach((update) => {
            if (update.success && update.newStock !== undefined) {
              io.emit("item:updated", {
                itemName: update.item,
                size: update.size,
                previousStock: update.previousStock,
                newStock: update.newStock,
                reason: `Order ${result.data.order_number} placed`,
              });
              console.log(
                `📡 Socket.IO: Emitted item:updated for ${update.item} (Size: ${update.size}) - Stock: ${update.previousStock} → ${update.newStock}`
              );
            }
          });
        }
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create order",
      });
    }
  }

  /**
   * Update order status
   * PATCH /api/orders/:id/status
   *
   * Request Body:
   * {
   *   status: string (required) - "pending", "paid", "claimed", "cancelled"
   * }
   */
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      const result = await OrderService.updateOrderStatus(id, status);

      // Emit Socket.IO event for real-time updates
      const io = req.app.get("io");
      if (io) {
        io.emit("order:updated", {
          orderId: id,
          status: status,
          order: result.data,
        });
        console.log(`📡 Socket.IO: Emitted order:updated for order ${id}`);

        // If status is "claimed", emit a specific event for activity tracking
        if (status === "claimed" && result.data) {
          io.emit("order:claimed", {
            orderId: result.data.id,
            orderNumber: result.data.order_number,
            userId: result.data.student_id, // Use student_id from database
            items: result.data.items,
          });
          console.log(`📡 Socket.IO: Emitted order:claimed for order ${result.data.order_number} to student ${result.data.student_id}`);
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update order status",
      });
    }
  }

  /**
   * Update order
   * PUT /api/orders/:id
   *
   * Request Body: Same as create, all fields optional
   */
  async updateOrder(req, res) {
    try {
      const { id } = req.params;
      const result = await OrderService.updateOrder(id, req.body);
      res.json(result);
    } catch (error) {
      console.error("Update order error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update order",
      });
    }
  }

  /**
   * Delete order (soft delete)
   * DELETE /api/orders/:id
   */
  async deleteOrder(req, res) {
    try {
      const { id } = req.params;
      const result = await OrderService.deleteOrder(id);
      res.json(result);
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete order",
      });
    }
  }

  /**
   * Get order statistics
   * GET /api/orders/stats
   */
  async getOrderStats(req, res) {
    try {
      const result = await OrderService.getOrderStats();
      res.json(result);
    } catch (error) {
      console.error("Get order stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch order statistics",
      });
    }
  }
}

module.exports = new OrderController();

