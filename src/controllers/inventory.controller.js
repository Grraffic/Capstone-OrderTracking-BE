const InventoryService = require("../services/inventory.service");

/**
 * Inventory Controller
 *
 * Handles HTTP requests and responses for inventory management endpoints.
 * Delegates business logic to InventoryService.
 */
class InventoryController {
  /**
   * Get all inventory items with optional filtering and pagination
   * GET /api/inventory
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10)
   * - educationLevel: Filter by education level
   * - category: Filter by category
   * - itemType: Filter by item type
   * - status: Filter by status
   * - search: Search by name, category, or description
   */
  async getInventoryItems(req, res) {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await InventoryService.getInventoryItems(
        filters,
        parseInt(page) || 1,
        parseInt(limit) || 10
      );
      res.json(result);
    } catch (error) {
      console.error("Get inventory items error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inventory items",
      });
    }
  }

  /**
   * Get single inventory item by ID
   * GET /api/inventory/:id
   */
  async getInventoryItemById(req, res) {
    try {
      const { id } = req.params;
      const result = await InventoryService.getInventoryItemById(id);
      res.json(result);
    } catch (error) {
      console.error("Get inventory item by ID error:", error);
      res.status(404).json({
        success: false,
        message: error.message || "Inventory item not found",
      });
    }
  }

  /**
   * Create new inventory item
   * POST /api/inventory
   *
   * Request Body:
   * {
   *   name: string (required),
   *   education_level: string (required),
   *   category: string (required),
   *   item_type: string (required),
   *   description: string (optional),
   *   description_text: string (optional),
   *   material: string (optional),
   *   stock: number (required),
   *   price: number (required),
   *   image: string (optional),
   *   physical_count: number (optional),
   *   available: number (optional),
   *   reorder_point: number (optional),
   *   note: string (optional)
   * }
   */
  async createInventoryItem(req, res) {
    try {
      const result = await InventoryService.createInventoryItem(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Create inventory item error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create inventory item",
      });
    }
  }

  /**
   * Update existing inventory item
   * PUT /api/inventory/:id
   *
   * Request Body: Same as create, all fields optional
   */
  async updateInventoryItem(req, res) {
    try {
      const { id } = req.params;
      const result = await InventoryService.updateInventoryItem(id, req.body);
      res.json(result);
    } catch (error) {
      console.error("Update inventory item error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update inventory item",
      });
    }
  }

  /**
   * Delete inventory item (soft delete)
   * DELETE /api/inventory/:id
   */
  async deleteInventoryItem(req, res) {
    try {
      const { id } = req.params;
      const result = await InventoryService.deleteInventoryItem(id);
      res.json(result);
    } catch (error) {
      console.error("Delete inventory item error:", error);
      res.status(404).json({
        success: false,
        message: error.message || "Failed to delete inventory item",
      });
    }
  }

  /**
   * Adjust inventory stock
   * PATCH /api/inventory/:id/adjust
   *
   * Request Body:
   * {
   *   adjustment: number (required) - positive or negative value,
   *   reason: string (optional) - reason for adjustment
   * }
   */
  async adjustInventoryStock(req, res) {
    try {
      const { id } = req.params;
      const { adjustment, reason } = req.body;

      if (typeof adjustment !== "number") {
        return res.status(400).json({
          success: false,
          message: "Adjustment value is required and must be a number",
        });
      }

      const result = await InventoryService.adjustInventoryStock(
        id,
        adjustment,
        reason
      );
      res.json(result);
    } catch (error) {
      console.error("Adjust inventory stock error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to adjust inventory stock",
      });
    }
  }

  /**
   * Get inventory statistics
   * GET /api/inventory/stats
   *
   * Returns:
   * {
   *   total_items: number,
   *   above_threshold_items: number,
   *   at_reorder_point_items: number,
   *   critical_items: number,
   *   out_of_stock_items: number,
   *   total_value: number
   * }
   */
  async getInventoryStats(req, res) {
    try {
      const result = await InventoryService.getInventoryStats();
      res.json(result);
    } catch (error) {
      console.error("Get inventory stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inventory statistics",
      });
    }
  }

  /**
   * Get low stock items (Critical and At Reorder Point)
   * GET /api/inventory/low-stock
   */
  async getLowStockItems(req, res) {
    try {
      const result = await InventoryService.getLowStockItems();
      res.json(result);
    } catch (error) {
      console.error("Get low stock items error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch low stock items",
      });
    }
  }
}

module.exports = new InventoryController();

