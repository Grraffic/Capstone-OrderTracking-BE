const studentItemPermissionsService = require("../../services/system_admin/student_item_permissions.service");

/**
 * Student Permissions Controller
 *
 * Handles HTTP requests for student item permissions management
 */

/**
 * Get items for permission management for a student
 * GET /api/system-admin/student-permissions/:studentId/items
 */
exports.getItemsForStudentPermission = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { educationLevel } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    if (!educationLevel) {
      return res.status(400).json({
        success: false,
        message: "Education level is required",
      });
    }

    const result = await studentItemPermissionsService.getItemsForStudentPermission(
      studentId,
      educationLevel
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Get items for student permission error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch items for permission management",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Get all permissions for a student
 * GET /api/system-admin/student-permissions/:studentId
 */
exports.getStudentItemPermissions = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const result = await studentItemPermissionsService.getStudentItemPermissions(studentId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Get student item permissions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student permissions",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Update permissions for a single student
 * POST /api/system-admin/student-permissions/:studentId
 */
exports.updateStudentItemPermissions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { permissions } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({
        success: false,
        message: "Permissions object is required",
      });
    }

    // Validate and normalize permissions format: {itemName: {enabled: boolean, quantity: number|null}} or {itemName: boolean}
    const normalizedPermissions = {};
    Object.entries(permissions).forEach(([itemName, perm]) => {
      if (typeof perm === "boolean") {
        normalizedPermissions[itemName] = { enabled: perm, quantity: null };
      } else if (typeof perm === "object" && perm !== null) {
        normalizedPermissions[itemName] = {
          enabled: Boolean(perm.enabled),
          quantity: perm.quantity != null && perm.quantity > 0 ? parseInt(perm.quantity, 10) : null,
        };
      }
    });

    const result = await studentItemPermissionsService.updateStudentItemPermissions(
      studentId,
      normalizedPermissions
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Emit Socket.IO event to notify the student that their permissions have been updated
    // This ensures the student interface immediately reflects permission changes
    try {
      const io = req.app.get("io");
      if (io) {
        // Get student's user_id (Supabase Auth UID) to emit event to the correct user
        const supabase = require("../../config/supabase");
        const { data: studentRow } = await supabase
          .from("students")
          .select("user_id")
          .eq("id", studentId)
          .maybeSingle();
        
        if (studentRow?.user_id) {
          console.log(`📡 Emitting student:permissions:updated event for student ${studentId} to user ${studentRow.user_id}`);
          io.emit("student:permissions:updated", {
            studentId: studentId,
            userId: studentRow.user_id,
            permissions: normalizedPermissions,
          });
        } else {
          console.log(`⚠️ Could not find user_id for student ${studentId}, skipping Socket.IO event`);
        }
      }
    } catch (socketError) {
      // Don't fail the request if Socket.IO emission fails
      console.error("Error emitting student:permissions:updated event:", socketError);
    }

    res.json(result);
  } catch (error) {
    console.error("Update student item permissions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update student permissions",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Bulk update permissions for multiple students
 * POST /api/system-admin/student-permissions/bulk
 */
exports.bulkUpdateStudentItemPermissions = async (req, res) => {
  try {
    const { studentIds, permissions } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student IDs array is required and must not be empty",
      });
    }

    if (!permissions || typeof permissions !== "object") {
      return res.status(400).json({
        success: false,
        message: "Permissions object is required",
      });
    }

    // Validate and normalize permissions format
    const normalizedPermissions = {};
    Object.entries(permissions).forEach(([itemName, perm]) => {
      if (typeof perm === "boolean") {
        normalizedPermissions[itemName] = { enabled: perm, quantity: null };
      } else if (typeof perm === "object" && perm !== null) {
        normalizedPermissions[itemName] = {
          enabled: Boolean(perm.enabled),
          quantity: perm.quantity != null && perm.quantity > 0 ? parseInt(perm.quantity, 10) : null,
        };
      }
    });

    const result = await studentItemPermissionsService.bulkUpdateStudentItemPermissions(
      studentIds,
      normalizedPermissions
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Bulk update student item permissions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to bulk update student permissions",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
