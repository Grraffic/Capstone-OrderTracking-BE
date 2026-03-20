const studentStatusService = require("../../services/system_admin/student_status.service");

exports.updateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, lookup_email } = req.body || {};

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean",
      });
    }

    const result = await studentStatusService.updateStudentStatus(
      id,
      is_active,
      lookup_email || ""
    );
    const { student: updated, lookupSource } = result;

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
        lookup_attempted: true,
        lookup_source: lookupSource,
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("student:updated", {
        student: updated,
        updates: { is_active },
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: updated,
      lookup_source: lookupSource,
      message: "Student status updated successfully",
    });
  } catch (error) {
    console.error("Error in updateStudentStatus controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update student status",
      error: error.message,
    });
  }
};

