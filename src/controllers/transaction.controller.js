const TransactionService = require("../services/transaction.service");

/**
 * Transaction Controller
 * 
 * Handles HTTP requests for transaction logging and retrieval
 */
class TransactionController {
  /**
   * Get all transactions with optional filters
   * GET /api/transactions
   * 
   * Query params:
   * - type: Filter by transaction type (Order, Inventory, Item, User)
   * - action: Filter by action
   * - userId: Filter by user ID
   * - startDate: Start date for date range (ISO string)
   * - endDate: End date for date range (ISO string)
   * - limit: Maximum number of results (default: 100)
   * - offset: Offset for pagination (default: 0)
   */
  async getTransactions(req, res) {
    try {
      console.log("[TransactionController] 📥 Received getTransactions request");
      console.log("[TransactionController] Query params:", req.query);
      
      const {
        type,
        action,
        userId,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      // Build filters object
      const filters = {};

      if (type) filters.type = type;
      if (action) filters.action = action;
      if (userId) filters.userId = userId;

      if (startDate) {
        filters.startDate = new Date(startDate);
        console.log("[TransactionController] 📅 Parsed startDate:", filters.startDate.toISOString());
      }

      if (endDate) {
        filters.endDate = new Date(endDate);
        console.log("[TransactionController] 📅 Parsed endDate:", filters.endDate.toISOString());
      }

      if (limit) {
        filters.limit = parseInt(limit, 10);
      }

      if (offset) {
        filters.offset = parseInt(offset, 10);
      }

      console.log("[TransactionController] 🔍 Calling TransactionService.getTransactions with filters:", filters);
      const result = await TransactionService.getTransactions(filters);

      console.log("[TransactionController] ✅ Returning result:", {
        success: result.success,
        dataCount: result.data?.length || 0,
      });

      res.json(result);
    } catch (error) {
      console.error("[TransactionController] ❌ Get transactions error:", error);
      console.error("[TransactionController] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get transactions",
      });
    }
  }

  /**
   * Get transaction by ID
   * GET /api/transactions/:id
   */
  async getTransactionById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID is required",
        });
      }

      const result = await TransactionService.getTransactionById(id);

      res.json(result);
    } catch (error) {
      console.error("Get transaction by ID error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get transaction",
      });
    }
  }

  /**
   * Get recent transactions
   * GET /api/transactions/recent
   * 
   * Query params:
   * - limit: Maximum number of results (default: 50)
   */
  async getRecentTransactions(req, res) {
    try {
      const { limit } = req.query;
      const result = await TransactionService.getRecentTransactions(
        limit ? parseInt(limit, 10) : 50
      );

      res.json(result);
    } catch (error) {
      console.error("Get recent transactions error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get recent transactions",
      });
    }
  }

  /**
   * Get transactions by type
   * GET /api/transactions/type/:type
   * 
   * Query params:
   * - limit: Maximum number of results (default: 100)
   */
  async getTransactionsByType(req, res) {
    try {
      const { type } = req.params;
      const { limit } = req.query;

      if (!type) {
        return res.status(400).json({
          success: false,
          message: "Transaction type is required",
        });
      }

      const result = await TransactionService.getTransactionsByType(
        type,
        limit ? parseInt(limit, 10) : 100
      );

      res.json(result);
    } catch (error) {
      console.error("Get transactions by type error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get transactions by type",
      });
    }
  }

  /**
   * Create sample transactions for testing
   * POST /api/transactions/sample
   * Property custodian only - for testing purposes
   */
  async createSampleTransactions(req, res) {
    try {
      const sampleTransactions = [
        {
          type: "Order",
          action: "ORDER CREATED",
          userId: req.user?.id || null,
          details: "Order #ORD-20250101-001 created with 3 item(s) by Test Student (Senior High School)",
          metadata: {
            order_number: "ORD-20250101-001",
            item_count: 3,
            total_amount: 350.00,
            education_level: "Senior High School",
          },
        },
        {
          type: "Order",
          action: "ORDER CLAIMED",
          userId: req.user?.id || null,
          details: "Order #ORD-20250101-001 status changed from pending to claimed for Test Student",
          metadata: {
            order_number: "ORD-20250101-001",
            previous_status: "pending",
            new_status: "claimed",
          },
        },
        {
          type: "Inventory",
          action: "PURCHASE RECORDED",
          userId: req.user?.id || null,
          details: "Purchase recorded: 50 unit(s) of SHS Men's Polo (Size: Medium) at ₱120 per unit",
          metadata: {
            item_name: "SHS Men's Polo",
            size: "Medium",
            quantity: 50,
            unit_price: 120,
            previous_stock: 100,
            new_stock: 150,
          },
        },
        {
          type: "Inventory",
          action: "PURCHASE RECORDED",
          userId: req.user?.id || null,
          details: "Purchase recorded: 30 unit(s) of Elementary Girls' Dress (Size: Small) at ₱150 per unit",
          metadata: {
            item_name: "Elementary Girls' Dress",
            size: "Small",
            quantity: 30,
            unit_price: 150,
            previous_stock: 75,
            new_stock: 105,
          },
        },
        {
          type: "Item",
          action: "ITEM CREATED",
          userId: req.user?.id || null,
          details: "Item created: College Men's Polo (College) - Size: Large",
          metadata: {
            item_name: "College Men's Polo",
            education_level: "College",
            category: "School Uniform",
            size: "Large",
            stock: 200,
            beginning_inventory: 200,
          },
        },
        {
          type: "Item",
          action: "ITEM DETAILS UPDATED",
          userId: req.user?.id || null,
          details: "Item details updated: SHS Men's Polo (Senior High School) - Changed: price, description",
          metadata: {
            item_name: "SHS Men's Polo",
            education_level: "Senior High School",
            updated_fields: ["price", "description"],
          },
        },
      ];

      const created = [];
      for (const tx of sampleTransactions) {
        try {
          const result = await TransactionService.logTransaction(
            tx.type,
            tx.action,
            tx.userId,
            tx.details,
            tx.metadata
          );
          created.push(result.data);
        } catch (error) {
          console.error(`Failed to create sample transaction ${tx.action}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Created ${created.length} sample transactions`,
        data: created,
      });
    } catch (error) {
      console.error("Create sample transactions error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create sample transactions",
      });
    }
  }
}

module.exports = new TransactionController();
