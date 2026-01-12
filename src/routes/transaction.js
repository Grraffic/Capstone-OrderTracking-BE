const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const { verifyToken, requirePropertyCustodian } = require("../middleware/auth");

/**
 * Transaction Routes
 * 
 * All routes require property custodian role
 */

/**
 * GET /api/transactions
 * Get all transactions with optional filters
 * Query params: type, action, userId, startDate, endDate, limit, offset
 */
router.get(
  "/",
  verifyToken,
  requirePropertyCustodian,
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
  requirePropertyCustodian,
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
  requirePropertyCustodian,
  transactionController.getTransactionsByType
);

/**
 * POST /api/transactions/sample
 * Create sample transactions for testing
 * Property custodian only
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.post(
  "/sample",
  verifyToken,
  requirePropertyCustodian,
  transactionController.createSampleTransactions
);

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get(
  "/:id",
  verifyToken,
  requirePropertyCustodian,
  transactionController.getTransactionById
);

module.exports = router;
