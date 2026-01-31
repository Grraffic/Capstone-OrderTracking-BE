/**
 * Resolves current user (JWT id = users.id or auth.uid) to student or staff row.
 * Use for profile, orders, cart, and role checks after students/staff migration.
 */

const supabase = require("../config/supabase");

const STAFF_ROLES = [
  "system_admin",
  "property_custodian",
  "finance_staff",
  "accounting_staff",
  "department_head",
];

/**
 * Get profile row from students or staff by user id (JWT payload id = users.id).
 * @param {string} userId - users.id or auth.uid()
 * @returns {Promise<{ type: 'student'|'staff', row: object, id: string }|null>}
 */
async function getProfileByUserId(userId) {
  if (!userId) return null;

  const uid = String(userId).trim();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (student) {
    return { type: "student", row: student, id: student.id };
  }

  const { data: staffRow } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (staffRow) {
    return { type: "staff", row: staffRow, id: staffRow.id };
  }

  return null;
}

/**
 * Get profile by email (fallback when userId not available).
 * @param {string} email
 * @returns {Promise<{ type: 'student'|'staff', row: object, id: string }|null>}
 */
async function getProfileByEmail(email) {
  if (!email) return null;

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("email", String(email).toLowerCase().trim())
    .maybeSingle();

  if (student) return { type: "student", row: student, id: student.id };

  const { data: staffRow } = await supabase
    .from("staff")
    .select("*")
    .eq("email", String(email).toLowerCase().trim())
    .maybeSingle();

  if (staffRow) return { type: "staff", row: staffRow, id: staffRow.id };

  return null;
}

/**
 * Resolve user to student or staff; fallback to users table for backward compatibility.
 * @param {object} tokenUser - { id, email, role, ... } from JWT
 * @returns {Promise<{ type: 'student'|'staff'|'user', row: object, id: string, role: string }|null>}
 */
async function resolveProfile(tokenUser) {
  if (!tokenUser) return null;

  const byId = await getProfileByUserId(tokenUser.id);
  if (byId) {
    const role = byId.type === "staff" ? byId.row.role : "student";
    return { ...byId, role };
  }

  const byEmail = await getProfileByEmail(tokenUser.email);
  if (byEmail) {
    const role = byEmail.type === "staff" ? byEmail.row.role : "student";
    return { ...byEmail, role };
  }

  return null;
}

/**
 * Get student id for current user (for orders.student_id, cart_items.student_id).
 * @param {string} userId - JWT id
 * @returns {Promise<string|null>} students.id or null
 */
async function getStudentIdForUser(userId) {
  const profile = await getProfileByUserId(userId);
  if (profile && profile.type === "student") return profile.id;
  return null;
}

/**
 * Get student row by students.id (for order service limits, enrichment).
 * @param {string} studentId - students.id
 * @returns {Promise<object|null>}
 */
async function getStudentRowById(studentId) {
  if (!studentId) return null;
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();
  return data;
}

module.exports = {
  getProfileByUserId,
  getProfileByEmail,
  resolveProfile,
  getStudentIdForUser,
  getStudentRowById,
  STAFF_ROLES,
};
