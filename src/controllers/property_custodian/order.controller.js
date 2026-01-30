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
      // Always set student identity from JWT when authenticated so "already ordered"
      // (GET /auth/max-quantities) matches the same id/email
      if (req.user) {
        if (req.user.id) req.body.student_id = req.user.id;
        if (req.user.email) req.body.student_email = req.user.email;
      }
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

      // Students may only cancel their own order; property custodian / system admin may set any status
      const userRole = (req.user && req.user.role) ? String(req.user.role).toLowerCase() : "";
      const isStudent = userRole === "student";

      if (isStudent) {
        if (status !== "cancelled") {
          return res.status(403).json({
            success: false,
            message: "Students may only cancel their order, not change to another status.",
          });
        }
        const orderResult = await OrderService.getOrderById(id);
        if (!orderResult.success || !orderResult.data) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }
        const orderData = orderResult.data;
        const userId = req.user.id || req.user.sub;
        const userEmail = (req.user.email || "").trim().toLowerCase();
        const orderStudentId = orderData.student_id ? String(orderData.student_id) : "";
        const orderEmail = (orderData.student_email || "").trim().toLowerCase();
        const isOwner =
          (userId && orderStudentId && orderStudentId === String(userId)) ||
          (userEmail && orderEmail && orderEmail === userEmail);
        if (!isOwner) {
          return res.status(403).json({
            success: false,
            message: "You can only cancel your own order.",
          });
        }
      }

      const optionalNote = isStudent && status === "cancelled" ? "Cancelled by student." : req.body.notes || undefined;
      const result = await OrderService.updateOrderStatus(id, status, optionalNote);

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
   * Student confirms order within claim window (e.g. 10 seconds)
   * PATCH /api/orders/:id/confirm
   */
  async confirmOrder(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      const studentId = user.id || user.uid || null;
      const studentEmail = (user.email || "").trim() || null;
      const result = await OrderService.confirmOrderByStudent(id, studentId, studentEmail);
      res.json(result);
    } catch (error) {
      console.error("Confirm order error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to confirm order",
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
      const io = req.app.get("io");
      if (io && result?.data) {
        io.emit("order:updated", { orderId: id, order: result.data });
      }
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

  /**
   * Convert pre-order to regular order (manual conversion)
   * POST /api/orders/:id/convert-pre-order
   *
   * This endpoint allows students to manually convert their pre-orders
   * to regular orders when items become available.
   */
  async convertPreOrder(req, res) {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        console.error(`Invalid UUID format received: ${id}`);
        return res.status(400).json({
          success: false,
          message: `Invalid order ID format. Expected UUID, got: ${id}`,
        });
      }

      console.log(`🔄 Converting pre-order with ID: ${id}`);

      // Get the order first to check if it's a pre-order
      let order;
      try {
        const result = await OrderService.getOrderById(id);
        order = result;
      } catch (fetchError) {
        console.error(`Error fetching order ${id}:`, fetchError);
        return res.status(404).json({
          success: false,
          message: `Order not found: ${fetchError.message || "Order does not exist"}`,
        });
      }
      
      if (!order || !order.success) {
        console.error(`Order ${id} not found or invalid response:`, order);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const orderData = order.data;

      // Verify it's a pre-order
      if (orderData.order_type !== "pre-order") {
        return res.status(400).json({
          success: false,
          message: "Order is not a pre-order",
        });
      }

      // Convert the entire pre-order (all items)
      // We'll convert using the first item's name as a trigger
      // The service function will handle converting all items
      const items = orderData.items || [];
      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Pre-order has no items",
        });
      }

      // Use the first item to trigger conversion (the function converts the entire order)
      const firstItem = items[0];
      const result = await OrderService.convertPreOrderToRegular(
        id,
        firstItem.name,
        firstItem.size || null
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || "Failed to convert pre-order",
        });
      }

      // Emit Socket.IO event for real-time updates
      const io = req.app.get("io");
      if (io) {
        io.emit("order:converted", {
          orderId: id,
          orderNumber: orderData.order_number,
          userId: orderData.student_id,
          order: result.data,
        });
        console.log(`📡 Socket.IO: Emitted order:converted for order ${id}`);
      }

      res.json({
        success: true,
        message: "Pre-order converted to regular order successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Convert pre-order error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to convert pre-order",
      });
    }
  }
}

module.exports = new OrderController();

