const supabase = require("../../config/supabase");

const isInactiveStudent = (row) => {
  if (!row || typeof row !== "object") return false;
  if ("status" in row) return row.status === "inactive";
  if ("is_active" in row) return row.is_active === false;
  return false;
};

async function resolveStudentByAnyId(studentId, lookupEmail = "") {
  const id = String(studentId || "").trim();
  if (!id) return { student: null, lookupSource: "missing_id" };

  const { data: byId } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (byId) return { student: byId, lookupSource: "students.id" };

  const { data: byUserId } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();
  if (byUserId) return { student: byUserId, lookupSource: "students.user_id" };

  // Legacy fallback if this column exists in some environments.
  let byLegacyUserId = null;
  try {
    const result = await supabase
      .from("students")
      .select("*")
      .eq("legacy_user_id", id)
      .maybeSingle();
    byLegacyUserId = result.data;
  } catch (_) {
    byLegacyUserId = null;
  }
  if (byLegacyUserId) {
    return { student: byLegacyUserId, lookupSource: "students.legacy_user_id" };
  }

  if (lookupEmail && String(lookupEmail).trim()) {
    const normalizedEmail = String(lookupEmail).toLowerCase().trim();
    const { data: byEmail } = await supabase
      .from("students")
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();
    if (byEmail) return { student: byEmail, lookupSource: "students.email" };
  }

  // Optional compatibility bridge if users table still exists in some environments.
  try {
    const { data: legacyUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", id)
      .maybeSingle();
    if (legacyUser?.email) {
      const normalizedLegacyEmail = String(legacyUser.email).toLowerCase().trim();
      const { data: byLegacyEmail } = await supabase
        .from("students")
        .select("*")
        .ilike("email", normalizedLegacyEmail)
        .maybeSingle();
      if (byLegacyEmail) {
        return { student: byLegacyEmail, lookupSource: "users.email->students.email" };
      }
    }
  } catch (_) {
    // users table may be dropped after migration; ignore.
  }

  return { student: null, lookupSource: "not_found" };
}

async function updateStudentStatus(studentId, isActive, lookupEmail = "") {
  const { student, lookupSource } = await resolveStudentByAnyId(studentId, lookupEmail);
  if (!student) return { student: null, lookupSource };

  const hasStatusColumn = Object.prototype.hasOwnProperty.call(student, "status");
  const nextStatus = isActive ? "active" : "inactive";
  const updatePayload = {
    updated_at: new Date().toISOString(),
  };
  if (hasStatusColumn) {
    updatePayload.status = nextStatus;
  } else {
    updatePayload.is_active = isActive;
  }

  const { data, error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", student.id)
    .select("*")
    .single();

  if (error) throw error;
  return {
    student: {
      ...data,
      role: "student",
      is_active: !isInactiveStudent(data),
    },
    lookupSource,
  };
}

module.exports = {
  updateStudentStatus,
};

