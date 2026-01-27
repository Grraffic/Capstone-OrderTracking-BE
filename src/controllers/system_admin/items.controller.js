const SystemAdminItemsService = require("../../services/system_admin/items.service");

/**
 * System Admin Items Controller
 * 
 * Handles HTTP requests for item approval management
 */
class SystemAdminItemsController {
  /**
   * Get all items (with optional filters)
   * GET /api/system-admin/items
   */
  async getItems(req, res) {
    try {
      const { pendingOnly, search, page = 1, limit = 10 } = req.query;

      const result = await SystemAdminItemsService.getItems(
        {
          pendingOnly: pendingOnly === "true",
          search,
        },
        parseInt(page),
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      console.error("[SystemAdminItemsController] Get items error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch items",
      });
    }
  }

  /**
   * Approve a single item
   * POST /api/system-admin/items/:id/approve
   */
  async approveItem(req, res) {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id || null;

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      const result = await SystemAdminItemsService.approveItem(id, approvedBy);

      // Emit socket event for real-time updates
      const io = req.app.get("io");
      if (io) {
        io.emit("item:approved", {
          itemId: id,
          approvedBy,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("[SystemAdminItemsController] Approve item error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to approve item",
      });
    }
  }

  /**
   * Approve multiple items
   * POST /api/system-admin/items/approve
   */
  async approveItems(req, res) {
    try {
      const { itemIds } = req.body;
      const approvedBy = req.user?.id || null;

      if (!approvedBy) {
        return res.status(401).json({
          success: false,
          message: "User authentication required",
        });
      }

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Item IDs array is required",
        });
      }

      const result = await SystemAdminItemsService.approveMultipleItems(itemIds, approvedBy);

      // Emit socket event for real-time updates
      const io = req.app.get("io");
      if (io) {
        io.emit("items:approved", {
          itemIds,
          approvedBy,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("[SystemAdminItemsController] Approve items error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to approve items",
      });
    }
  }

  /**
   * Reject an item (set back to pending)
   * POST /api/system-admin/items/:id/reject
   */
  async rejectItem(req, res) {
    try {
      const { id } = req.params;

      const result = await SystemAdminItemsService.rejectItem(id);

      // Emit socket event for real-time updates
      const io = req.app.get("io");
      if (io) {
        io.emit("item:rejected", {
          itemId: id,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("[SystemAdminItemsController] Reject item error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to reject item",
      });
    }
  }

  /**
   * Get approval statistics
   * GET /api/system-admin/items/stats
   */
  async getApprovalStats(req, res) {
    try {
      const result = await SystemAdminItemsService.getApprovalStats();
      res.json(result);
    } catch (error) {
      console.error("[SystemAdminItemsController] Get approval stats error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch approval statistics",
      });
    }
  }
}

module.exports = new SystemAdminItemsController();
