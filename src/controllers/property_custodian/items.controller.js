const ItemsService = require("../../services/property_custodian/items.service");
const NotificationService = require("../../services/notification.service");
const { uploadImage } = require("../../services/cloudinary.service");

/**
 * Items Controller
 *
 * Handles HTTP requests and responses for items management endpoints.
 * Delegates business logic to ItemsService.
 */
class ItemsController {
  /**
   * Upload an item image to Cloudinary
   * POST /api/items/upload-image
   */
  async uploadItemImage(req, res) {
    try {
      const { image, fileName } = req.body || {};

      if (!image || typeof image !== "string") {
        return res
          .status(400)
          .json({
            success: false,
            message: "Image payload is required and must be a string",
          });
      }

      console.log("📤 Uploading item image to Cloudinary...", {
        fileName: fileName || "unnamed-file",
      });

      const result = await uploadImage(image, {
        folder: "la-verdad-uniforms/inventory-items",
        width: 800,
        height: 800,
        crop: "fill",
        format: "auto",
        quality: "auto",
      });

      if (!result?.success || !result?.url) {
        return res
          .status(500)
          .json({
            success: false,
            message: "Failed to upload item image to Cloudinary",
          });
      }

      return res.json({ success: true, url: result.url });
    } catch (error) {
      console.error("Upload item image error:", error);
      return res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to upload item image",
        });
    }
  }

  /**
   * Get all items with optional filtering and pagination
   * GET /api/items
   */
  async getItems(req, res) {
    try {
      const { page, limit, userEducationLevel, ...filters } = req.query;
      
      // If userEducationLevel is provided, use it for eligibility filtering
      // This is typically sent by students to see only items they're eligible for
      const filtersWithEligibility = {
        ...filters,
        ...(userEducationLevel ? { userEducationLevel } : {}),
      };
      
      const result = await ItemsService.getItems(
        filtersWithEligibility,
        parseInt(page) || 1,
        parseInt(limit) || 10
      );
      res.json(result);
    } catch (error) {
      console.error("Get items error:", error);
      const isTimeout =
        error.code === "57014" || error.message?.includes("timeout");
      res.status(isTimeout ? 504 : 500).json({
        success: false,
        message: isTimeout
          ? "Database query timeout. Please try again or contact support."
          : error.message || "Failed to fetch items",
        errorCode: error.code,
      });
    }
  }

  /**
   * Get single item by ID
   * GET /api/items/:id
   */
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      const result = await ItemsService.getItemById(id);
      res.json(result);
    } catch (error) {
      console.error("Get item by ID error:", error);
      res
        .status(404)
        .json({ success: false, message: error.message || "Item not found" });
    }
  }

  /**
   * Get pending pre-order count for an item
   * GET /api/items/:id/pre-order-count
   */
  async getPreOrderCount(req, res) {
    try {
      const { id } = req.params;
      const itemResult = await ItemsService.getItemById(id);
      if (!itemResult.success) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      const item = itemResult.data;
      const studentsWithPreOrders =
        await NotificationService.findStudentsWithPendingPreOrders(
          item.name,
          item.education_level,
          item.size || null
        );

      res.json({
        success: true,
        count: studentsWithPreOrders.length,
        students: studentsWithPreOrders,
      });
    } catch (error) {
      console.error("Get pre-order count error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: error.message || "Failed to get pre-order count",
        });
    }
  }

  /**
   * Get available sizes for a product
   * GET /api/items/sizes/:name/:educationLevel
   */
  async getAvailableSizes(req, res) {
    try {
      const { name, educationLevel } = req.params;
      const decodedName = decodeURIComponent(name);
      const decodedEducationLevel = decodeURIComponent(educationLevel);
      const result = await ItemsService.getAvailableSizes(
        decodedName,
        decodedEducationLevel
      );
      res.json(result);
    } catch (error) {
      console.error("Get available sizes error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: error.message || "Failed to get available sizes",
        });
    }
  }

  /**
   * Get curated item name suggestions (for item name dropdown/autocomplete)
   * GET /api/items/name-suggestions
   */
  async getNameSuggestions(req, res) {
    try {
      const { educationLevel, search, limit } = req.query;
      const result = await ItemsService.getNameSuggestions({
        educationLevel: educationLevel || null,
        search: search || null,
        limit: limit != null ? Number(limit) : undefined,
      });
      return res.json(result);
    } catch (error) {
      console.error("Get name suggestions error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch name suggestions",
      });
    }
  }

  /**
   * Create new item
   * POST /api/items
   */
  async createItem(req, res) {
    try {
      const io = req.app.get("io");
      console.log(`[ItemsController] 📥 Received createItem request:`, {
        name: req.body.name,
        size: req.body.size,
        stock: req.body.stock,
        education_level: req.body.education_level
      });
      
      const userId = req.user?.id || null;
      const userEmail = req.user?.email || null;
      console.log(`[ItemsController] 👤 User info from request:`, {
        userId: userId,
        userEmail: userEmail,
        userName: req.user?.name,
        userRole: req.user?.role,
        allUserKeys: Object.keys(req.user || {}),
      });
      // Pass both userId and userEmail to service for better user lookup
      const result = await ItemsService.createItem(req.body, io, userId, userEmail);

      console.log(`[ItemsController] 📤 Sending response:`, {
        success: result.success,
        isExisting: result.isExisting,
        purchases: result.data?.purchases,
        beginning_inventory: result.data?.beginning_inventory,
        stock: result.data?.stock
      });

      // Emit socket event for item creation to trigger transaction refresh
      if (io && result.success) {
        io.emit("item:created", {
          itemId: result.data?.id,
          itemName: result.data?.name,
          isExisting: result.isExisting || false,
        });
        console.log(`📡 Socket.IO: Emitted item:created for item ${result.data?.name}`);
      }

      if (result.notificationInfo && result.notificationInfo.notified > 0) {
        console.log(
          `✅ Notified ${result.notificationInfo.notified} students about new item availability`
        );
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("[ItemsController] ❌ Create item error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: error.message || "Failed to create item",
        });
    }
  }

  /**
   * Update existing item
   * PUT /api/items/:id
   */
  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const io = req.app.get("io");
      const result = await ItemsService.updateItem(id, req.body, io);

      if (result.notificationInfo && result.notificationInfo.notified > 0) {
        console.log(
          `✅ Notified ${result.notificationInfo.notified} students about restock`
        );
      }

      // Update transaction with user ID if available
      if (result.success && req.user?.id) {
        try {
          const TransactionService = require("../../services/transaction.service");
          const { data: transactions } = await TransactionService.getTransactions({
            type: "Item",
            action: "ITEM DETAILS UPDATED",
            limit: 1,
          });
          if (transactions && transactions.length > 0 && transactions[0].metadata?.item_id === result.data.id) {
            const supabase = require("../../config/supabase");
            await supabase
              .from("transactions")
              .update({
                user_id: req.user.id,
                user_name: req.user.name || "Unknown User",
                user_role: req.user.role || "unknown",
              })
              .eq("id", transactions[0].id);
          }
        } catch (txError) {
          console.error("Failed to update transaction with user ID:", txError);
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Update item error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: error.message || "Failed to update item",
        });
    }
  }

  /**
   * Archive item (set is_archived = true)
   * PATCH /api/items/:id/archive
   * Emits item:archived so students and property custodian refetch immediately.
   */
  async archiveItem(req, res) {
    try {
      const { id } = req.params;
      const result = await ItemsService.archiveItem(id);
      const io = req.app.get("io");
      if (io && result.success && result.data) {
        io.emit("item:archived", {
          itemId: result.data.id,
          itemName: result.data.name,
        });
        console.log(`📡 Socket.IO: Emitted item:archived for item ${result.data.name} (${id})`);
      }
      res.json(result);
    } catch (error) {
      console.error("Archive item error:", error);
      res
        .status(error.message?.includes("not found") ? 404 : 400)
        .json({
          success: false,
          message: error.message || "Failed to archive item",
        });
    }
  }

  /**
   * Delete item (soft delete)
   * DELETE /api/items/:id
   */
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      const result = await ItemsService.deleteItem(id);
      res.json(result);
    } catch (error) {
      console.error("Delete item error:", error);
      res
        .status(404)
        .json({
          success: false,
          message: error.message || "Failed to delete item",
        });
    }
  }

  /**
   * Adjust item stock
   * PATCH /api/items/:id/adjust
   */
  async adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { adjustment, reason, size } = req.body;

      if (typeof adjustment !== "number") {
        return res
          .status(400)
          .json({
            success: false,
            message: "Adjustment value is required and must be a number",
          });
      }

      const io = req.app.get("io");
      const result = await ItemsService.adjustStock(id, adjustment, reason, io, size);

      if (result.notificationInfo && result.notificationInfo.notified > 0) {
        console.log(
          `✅ Notified ${result.notificationInfo.notified} students about restock`
        );
      }

      res.json(result);
    } catch (error) {
      console.error("Adjust item stock error:", error);
      res
        .status(400)
        .json({
          success: false,
          message: error.message || "Failed to adjust item stock",
        });
    }
  }

  /**
   * Get items statistics
   * GET /api/items/stats
   */
  async getStats(req, res) {
    try {
      const result = await ItemsService.getStats();
      res.json(result);
    } catch (error) {
      console.error("Get items stats error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to fetch items statistics",
        });
    }
  }

  /**
   * Get low stock items (Critical and At Reorder Point)
   * GET /api/items/low-stock
   */
  async getLowStockItems(req, res) {
    try {
      const result = await ItemsService.getLowStockItems();
      res.json(result);
    } catch (error) {
      console.error("Get low stock items error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: error.message || "Failed to fetch low stock items",
        });
    }
  }

  /**
   * Get inventory report
   * GET /api/items/inventory-report
   */
  async getInventoryReport(req, res) {
    try {
      const InventoryService = require("../../services/property_custodian/inventory.service");
      const result = await InventoryService.getInventoryReport(req.query);
      res.json(result);
    } catch (error) {
      console.error("Get inventory report error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inventory report",
      });
    }
  }

  /**
   * Add stock to item (purchases)
   * POST /api/items/:id/add-stock
   * Body: { quantity, size?, unitPrice? }
   */
  async addStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, size, unitPrice } = req.body;
      const io = req.app.get("io"); // Get Socket.IO instance

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required and must be greater than 0",
        });
      }

      const InventoryService = require("../../services/property_custodian/inventory.service");
      const userId = req.user?.id || null;
      const userEmail = req.user?.email || null;
      const result = await InventoryService.addStock(id, quantity, size, unitPrice, io, userId, userEmail);
      res.json(result);
    } catch (error) {
      console.error("Add stock error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to add stock",
      });
    }
  }

  /**
   * Record a return (student returned item). Increases stock only; logs "RETURN RECORDED" for Returns table.
   * POST /api/items/:id/record-return
   * Body: { quantity, size?, unitPrice? }
   */
  async recordReturn(req, res) {
    try {
      const { id } = req.params;
      const { quantity, size, unitPrice } = req.body;
      const io = req.app.get("io");
      const userId = req.user?.id || null;
      const userEmail = req.user?.email || null;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required and must be greater than 0",
        });
      }

      const InventoryService = require("../../services/property_custodian/inventory.service");
      const result = await InventoryService.recordReturn(id, quantity, size, unitPrice, io, userId, userEmail);
      res.json(result);
    } catch (error) {
      console.error("Record return error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to record return",
      });
    }
  }

  /**
   * Reset beginning inventory manually
   * POST /api/items/:id/reset-beginning-inventory
   */
  async resetBeginningInventory(req, res) {
    try {
      const { id } = req.params;
      const InventoryService = require("../../services/property_custodian/inventory.service");
      const result = await InventoryService.resetBeginningInventory(id);
      res.json(result);
    } catch (error) {
      console.error("Reset beginning inventory error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to reset beginning inventory",
      });
    }
  }
}

module.exports = new ItemsController();
