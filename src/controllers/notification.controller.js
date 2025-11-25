const NotificationService = require("../services/notification.service");

/**
 * Notification Controller
 *
 * Handles HTTP requests and responses for notification management endpoints.
 * Delegates business logic to NotificationService.
 */
class NotificationController {
  /**
   * Get all notifications for the authenticated user
   * GET /api/notifications
   *
   * Query Parameters:
   * - unreadOnly: boolean (default: false) - Get only unread notifications
   */
  async getUserNotifications(req, res) {
    try {
      const userId = req.query.userId || req.user?.uid;
      const unreadOnly = req.query.unreadOnly === "true";

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await NotificationService.getUserNotifications(
        userId,
        unreadOnly
      );
      res.json(result);
    } catch (error) {
      console.error("Get user notifications error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get notifications",
      });
    }
  }

  /**
   * Get unread notification count for the authenticated user
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.query.userId || req.user?.uid;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await NotificationService.getUnreadCount(userId);
      res.json(result);
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get unread count",
      });
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const result = await NotificationService.markAsRead(id);
      res.json(result);
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to mark notification as read",
      });
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   * PATCH /api/notifications/mark-all-read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.body.userId || req.user?.uid;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      const result = await NotificationService.markAllAsRead(userId);
      res.json(result);
    } catch (error) {
      console.error("Mark all as read error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to mark all as read",
      });
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const result = await NotificationService.deleteNotification(id);
      res.json(result);
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete notification",
      });
    }
  }
}

module.exports = new NotificationController();

