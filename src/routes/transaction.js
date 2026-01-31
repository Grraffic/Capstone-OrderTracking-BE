const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { verifyToken, requirePropertyCustodian, requireAdminOrPropertyCustodian } = require("../middleware/auth");

/**
 * Transaction Routes
 * 
 * All routes require property custodian or system admin role
 */

/**
 * GET /api/transactions
 * Get all transactions with optional filters
 * Query params: type, action, userId, startDate, endDate, limit, offset
 */
router.get(
  "/",
  verifyToken,
  requireAdminOrPropertyCustodian,
  transactionController.getTransactions
);

/**
 * GET /api/transactions/recent
 * Get recent transactions
 * Query params: limit (default: 50)
 */
router.get(
  "/recent",
  verifyToken,
  requireAdminOrPropertyCustodian,
  transactionController.getRecentTransactions
);

/**
 * GET /api/transactions/type/:type
 * Get transactions by type
 * Query params: limit (default: 100)
 */
router.get(
  "/type/:type",
  verifyToken,
  requireAdminOrPropertyCustodian,
  transactionController.getTransactionsByType
);

/**
 * POST /api/transactions/sample
 * Create sample transactions for testing
 * Property custodian or system admin only
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.post(
  "/sample",
  verifyToken,
  requireAdminOrPropertyCustodian,
  transactionController.createSampleTransactions
);

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get(
  "/:id",
  verifyToken,
  requireAdminOrPropertyCustodian,
  transactionController.getTransactionById
);

module.exports = router;
