const maintenanceService = require("../../services/system_admin/maintenance.service");

/**
 * Maintenance Controller
 *
 * Handles HTTP requests for maintenance mode management
 */

/**
 * Get current maintenance mode settings
 * GET /api/system-admin/maintenance
 */
exports.getMaintenanceMode = async (req, res) => {
  try {
    const result = await maintenanceService.getMaintenanceMode();

    res.json(result);
  } catch (error) {
    console.error("Get maintenance mode error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    // Check if it's a table not found error
    if (error.message && error.message.includes("table not found")) {
      return res.status(500).json({
        success: false,
        message: error.message,
        hint: "Please run the migration: backend/src/db/maintenance_mode.sql in your Supabase SQL Editor",
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch maintenance mode settings",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Update maintenance mode settings
 * PUT /api/system-admin/maintenance
 */
exports.updateMaintenanceMode = async (req, res) => {
  try {
    const {
      is_enabled,
      display_message,
      scheduled_date,
      start_time,
      end_time,
      is_all_day,
    } = req.body;

    // Validate required fields
    if (is_enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: "is_enabled is required",
      });
    }

    // Validate message if maintenance is enabled
    if (is_enabled && (!display_message || !display_message.trim())) {
      return res.status(400).json({
        success: false,
        message: "Display message is required when maintenance mode is enabled",
      });
    }

    // Validate date format if provided
    if (scheduled_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(scheduled_date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Expected YYYY-MM-DD",
        });
      }
    }

    // Validate time format if provided
    if (start_time && !is_all_day) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(start_time)) {
        return res.status(400).json({
          success: false,
          message: "Invalid start time format. Expected HH:MM",
        });
      }
    }

    if (end_time && !is_all_day) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(end_time)) {
        return res.status(400).json({
          success: false,
          message: "Invalid end time format. Expected HH:MM",
        });
      }
    }

    // Validate time range if not all day
    if (!is_all_day && start_time && end_time) {
      const [startHours, startMinutes] = start_time.split(":").map(Number);
      const [endHours, endMinutes] = end_time.split(":").map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;

      if (endTotal <= startTotal) {
        return res.status(400).json({
          success: false,
          message: "End time must be after start time",
        });
      }
    }

    // Validate message length
    if (display_message && display_message.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Display message must be 500 characters or less",
      });
    }

    const userId = req.user?.id || null;

    const result = await maintenanceService.updateMaintenanceMode(
      {
        is_enabled: Boolean(is_enabled),
        display_message: display_message?.trim() || null,
        scheduled_date: scheduled_date || null,
        start_time: start_time || null,
        end_time: end_time || null,
        is_all_day: Boolean(is_all_day),
      },
      userId
    );

    res.json(result);
  } catch (error) {
    console.error("Update maintenance mode error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update maintenance mode settings",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Check if maintenance mode is currently active (public endpoint)
 * GET /api/maintenance/status
 */
exports.getMaintenanceStatus = async (req, res) => {
  try {
    console.log("📡 GET /api/maintenance/status - Checking maintenance status...");
    const result = await maintenanceService.isMaintenanceActive();
    
    console.log("📊 Maintenance status result:", result);

    res.json({
      success: true,
      isActive: result.isActive || false,
      message: result.message || null,
    });
  } catch (error) {
    console.error("❌ Get maintenance status error:", error);
    console.error("Error stack:", error.stack);
    // On error, return not active to avoid blocking users
    res.json({
      success: true,
      isActive: false,
      message: null,
    });
  }
};
