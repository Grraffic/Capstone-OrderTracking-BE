const supabase = require("../../config/supabase");

/**
 * Maintenance Service
 *
 * Handles all database operations for maintenance mode management
 * Maintenance mode allows system admins to schedule system downtime
 */

/**
 * Get current maintenance mode settings
 * Returns the single row from maintenance_mode table (or creates default if none exists)
 * @returns {Promise<Object>} Maintenance mode settings
 */
async function getMaintenanceMode() {
  try {
    // First, check if the table exists by attempting a simple query
    const { error: tableCheckError } = await supabase
      .from("maintenance_mode")
      .select("id")
      .limit(1);

    // If table doesn't exist (error code 42P01 = undefined_table)
    if (tableCheckError && (tableCheckError.code === "42P01" || tableCheckError.message?.includes("does not exist"))) {
      console.error("❌ maintenance_mode table does not exist!");
      throw new Error(
        "maintenance_mode table not found. Please run the migration: backend/src/db/maintenance_mode.sql"
      );
    }

    // Fetch the maintenance mode settings
    // Since we only have one row, we can use limit(1)
    const { data, error } = await supabase
      .from("maintenance_mode")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      // If no rows exist, create a default one
      if (error.code === "PGRST116") {
        console.log("No maintenance mode settings found, creating default...");
        const defaultSettings = {
          is_enabled: false,
          display_message: null,
          scheduled_date: null,
          start_time: null,
          end_time: null,
          is_all_day: false,
        };

        const { data: newData, error: insertError } = await supabase
          .from("maintenance_mode")
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create default maintenance mode:", insertError);
          throw new Error(`Failed to create default maintenance mode: ${insertError.message}`);
        }

        return {
          success: true,
          data: newData,
        };
      }

      // Log the error for debugging
      console.error("Error fetching maintenance mode:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      throw error;
    }

    return {
      success: true,
      data: data || {
        is_enabled: false,
        display_message: null,
        scheduled_date: null,
        start_time: null,
        end_time: null,
        is_all_day: false,
      },
    };
  } catch (error) {
    console.error("Error fetching maintenance mode:", error);
    throw error;
  }
}

/**
 * Update maintenance mode settings
 * Uses upsert pattern to ensure only one row exists
 * @param {Object} settings - Maintenance mode settings
 * @param {boolean} settings.is_enabled - Whether maintenance is enabled
 * @param {string} settings.display_message - Message to display to users
 * @param {string} settings.scheduled_date - Date in YYYY-MM-DD format
 * @param {string} settings.start_time - Start time in HH:MM format
 * @param {string} settings.end_time - End time in HH:MM format
 * @param {boolean} settings.is_all_day - Whether maintenance runs all day
 * @param {string} userId - ID of user making the update
 * @returns {Promise<Object>} Updated maintenance mode settings
 */
async function updateMaintenanceMode(settings, userId) {
  try {
    // Check if table exists first
    const { error: tableCheckError } = await supabase
      .from("maintenance_mode")
      .select("id")
      .limit(1);

    if (tableCheckError && (tableCheckError.code === "42P01" || tableCheckError.message?.includes("does not exist"))) {
      console.error("❌ maintenance_mode table does not exist!");
      throw new Error(
        "maintenance_mode table not found. Please run the migration: backend/src/db/maintenance_mode.sql"
      );
    }

    // Validate required fields
    if (settings.is_enabled && !settings.display_message?.trim()) {
      throw new Error("Display message is required when maintenance mode is enabled");
    }

    // Validate time range if not all day
    if (!settings.is_all_day && settings.start_time && settings.end_time) {
      const [startHours, startMinutes] = settings.start_time.split(":").map(Number);
      const [endHours, endMinutes] = settings.end_time.split(":").map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;

      if (endTotal <= startTotal) {
        throw new Error("End time must be after start time");
      }
    }

    // Prepare update data
    const updateData = {
      is_enabled: settings.is_enabled || false,
      display_message: settings.display_message?.trim() || null,
      scheduled_date: settings.scheduled_date || null,
      start_time: settings.is_all_day ? null : (settings.start_time || null),
      end_time: settings.is_all_day ? null : (settings.end_time || null),
      is_all_day: settings.is_all_day || false,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    };

    // Use upsert to ensure only one row exists
    // First, get existing row ID if it exists
    const { data: existing } = await supabase
      .from("maintenance_mode")
      .select("id")
      .limit(1)
      .single();

    let result;
    if (existing) {
      // Update existing row
      const { data, error } = await supabase
        .from("maintenance_mode")
        .update(updateData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from("maintenance_mode")
        .insert({
          ...updateData,
          created_by: userId || null,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error updating maintenance mode:", error);
    throw error;
  }
}

/**
 * Check if maintenance mode is currently active
 * Determines if maintenance is active based on:
 * - is_enabled flag
 * - Scheduled date
 * - Time range (if not all day)
 * @returns {Promise<Object>} { isActive: boolean, message: string | null }
 */
async function isMaintenanceActive() {
  try {
    const result = await getMaintenanceMode();
    
    console.log("🔍 isMaintenanceActive - getMaintenanceMode result:", result);

    if (!result || !result.success) {
      console.log("⚠️ No maintenance mode data found, maintenance is not active");
      // If error or no data, maintenance is not active
      return {
        isActive: false,
        message: null,
      };
    }

    const settings = result.data;
    
    if (!settings) {
      console.log("⚠️ Maintenance settings are null, maintenance is not active");
      return {
        isActive: false,
        message: null,
      };
    }
    
    console.log("🔍 Checking maintenance status:", {
      is_enabled: settings.is_enabled,
      scheduled_date: settings.scheduled_date,
      start_time: settings.start_time,
      end_time: settings.end_time,
      is_all_day: settings.is_all_day,
    });

    // If maintenance is not enabled, it's not active
    if (!settings.is_enabled) {
      console.log("✅ Maintenance mode is disabled");
      return {
        isActive: false,
        message: null,
      };
    }

    // If no scheduled date, maintenance is active immediately when enabled
    if (!settings.scheduled_date) {
      console.log("✅ Maintenance mode is ACTIVE (no scheduled date, active immediately)");
      return {
        isActive: true,
        message: settings.display_message || "System is under maintenance",
      };
    }

    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

    // Check if current date matches scheduled date
    if (currentDate !== settings.scheduled_date) {
      return {
        isActive: false,
        message: null,
      };
    }

    // If all day, maintenance is active
    if (settings.is_all_day) {
      console.log("✅ Maintenance mode is ACTIVE (all day)");
      return {
        isActive: true,
        message: settings.display_message || "System is under maintenance",
      };
    }

    // Check if current time is within the scheduled time range
    if (settings.start_time && settings.end_time) {
      const [startHours, startMinutes] = settings.start_time.split(":").map(Number);
      const [endHours, endMinutes] = settings.end_time.split(":").map(Number);
      const [currentHours, currentMinutes] = currentTime.split(":").map(Number);

      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;
      const currentTotal = currentHours * 60 + currentMinutes;

      console.log("🕐 Time check:", {
        currentTime,
        startTime: settings.start_time,
        endTime: settings.end_time,
        currentTotal,
        startTotal,
        endTotal,
        inRange: currentTotal >= startTotal && currentTotal < endTotal,
      });

      if (currentTotal >= startTotal && currentTotal < endTotal) {
        console.log("✅ Maintenance mode is ACTIVE (within time range)");
        return {
          isActive: true,
          message: settings.display_message || "System is under maintenance",
        };
      } else {
        console.log("⏰ Maintenance mode is scheduled but not currently active (outside time range)");
      }
    }

    // Maintenance is scheduled but not currently active
    console.log("⏰ Maintenance mode is scheduled but not currently active");
    return {
      isActive: false,
      message: null,
    };
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    // On error, assume maintenance is not active to avoid blocking users
    return {
      isActive: false,
      message: null,
    };
  }
}

module.exports = {
  getMaintenanceMode,
  updateMaintenanceMode,
  isMaintenanceActive,
};
