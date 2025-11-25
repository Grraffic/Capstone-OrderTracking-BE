const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
// const auth = require("../middleware/auth"); // Uncomment when auth middleware is ready

/**
 * Notification Routes
 *
 * All routes for notification management.
 * Note: Add authentication middleware when ready for production.
 */

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the authenticated user
 * Query Parameters:
 * - userId: User ID (Firebase UID)
 */
router.get("/unread-count", notificationController.getUnreadCount);

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 * Query Parameters:
 * - userId: User ID (Firebase UID)
 * - unreadOnly: boolean (default: false) - Get only unread notifications
 */
router.get("/", notificationController.getUserNotifications);

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 * Request Body:
 * - userId: User ID (Firebase UID)
 */
router.patch("/mark-all-read", notificationController.markAllAsRead);

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch("/:id/read", notificationController.markAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;

