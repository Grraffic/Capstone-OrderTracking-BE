const ItemsService = require("../services/items.service");
const NotificationService = require("../services/notification.service");
const { uploadImage } = require("../services/cloudinary.service");

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
      const { page, limit, ...filters } = req.query;
      const result = await ItemsService.getItems(
        filters,
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
   * Create new item
   * POST /api/items
   */
  async createItem(req, res) {
    try {
      const io = req.app.get("io");
      const result = await ItemsService.createItem(req.body, io);

      if (result.notificationInfo && result.notificationInfo.notified > 0) {
        console.log(
          `✅ Notified ${result.notificationInfo.notified} students about new item availability`
        );
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Create item error:", error);
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
      const { adjustment, reason } = req.body;

      if (typeof adjustment !== "number") {
        return res
          .status(400)
          .json({
            success: false,
            message: "Adjustment value is required and must be a number",
          });
      }

      const io = req.app.get("io");
      const result = await ItemsService.adjustStock(id, adjustment, reason, io);

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
}

module.exports = new ItemsController();
