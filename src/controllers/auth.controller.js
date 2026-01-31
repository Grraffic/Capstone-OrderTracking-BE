const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { isSpecialAdmin, isSystemAdmin } = require("../config/admin");
const emailRoleAssignmentService = require("../services/system_admin/emailRoleAssignment.service");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

exports.oauthCallback = async (req, res) => {
  try {
    console.log("Starting OAuth callback...");
    console.log("Full request user:", JSON.stringify(req.user, null, 2));

    const user = req.user;
    if (!user) {
      console.error("No user in request");
      return res.status(401).json({ message: "Authentication failed" });
    }

    // Get email from user object safely
    let email;
    if (typeof user.email === "string") {
      email = user.email;
    } else if (user.emails && user.emails[0]) {
      email = user.emails[0].value;
    } else if (typeof user.email === "object" && user.email) {
      email = user.email.value || user.email.email;
    }

    console.log("Extracted email:", email);
    if (!email) return res.status(400).json({ message: "No email present" });

    const normalizedEmail = String(email).toLowerCase();

    // First, check if user exists in students or staff (by email)
    let existingUser = null;
    let role = null;
    try {
      const { data: studentRow } = await supabase
        .from("students")
        .select("id, user_id, email, role")
        .ilike("email", normalizedEmail)
        .limit(1)
        .maybeSingle();
      if (studentRow) {
        existingUser = { id: studentRow.user_id, email: studentRow.email, role: "student" };
        role = "student";
        console.log("✅ Found existing student in database");
      }
      if (!existingUser) {
        const { data: staffRow } = await supabase
          .from("staff")
          .select("id, user_id, email, role, status")
          .ilike("email", normalizedEmail)
          .limit(1)
          .maybeSingle();
        if (staffRow) {
          existingUser = { id: staffRow.user_id, email: staffRow.email, role: staffRow.role };
          role = staffRow.role;
          if (staffRow.status === "inactive") {
            const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
            const redirectUrl = `${FRONTEND_URL.replace(/\/$/, "")}/auth/callback?error=account_inactive&email=${encodeURIComponent(email)}`;
            return res.redirect(302, redirectUrl);
          }
          console.log(`✅ Found existing staff in database with role: ${role}`);
        }
      }
    } catch (error) {
      console.warn("Error checking existing profile in database:", error.message);
    }

    // STEP 2: If no existing user found, check email_role_assignments table (system admin assigned roles)
    // This allows any email added by system admin to login regardless of domain
    if (!role) {
      let assignedRole = null;
      try {
        const assignment =
          await emailRoleAssignmentService.getEmailRoleAssignment(
            normalizedEmail
          );
        if (assignment) {
          assignedRole = assignment.role;
          role = assignedRole;
          console.log("✅ Found role assignment in database:", assignedRole);
        }
      } catch (error) {
        console.warn(
          "⚠️ Error checking email_role_assignments:",
          error.message
        );
        // Continue to fallback logic
      }
    }

    // STEP 3: If no assignment found, check domain patterns
    // Only apply domain restrictions if email is NOT in database (neither users nor email_role_assignments)
    if (!role) {
      const isStudent = normalizedEmail.endsWith("@student.laverdad.edu.ph");
      // Check for system admin first (highest priority)
      const isSystemAdminEmail = isSystemAdmin(normalizedEmail);
      // Check for property custodian (standard domain or special emails)
      const isSpecialAdminEmail = isSpecialAdmin(normalizedEmail);
      const isPropertyCustodian =
        normalizedEmail.endsWith("@laverdad.edu.ph") || isSpecialAdminEmail;

      if (!isStudent && !isPropertyCustodian && !isSystemAdminEmail) {
        // Redirect back to frontend with an error code so UI can show a friendly message
        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
        const redirectUrl = `${FRONTEND_URL.replace(
          /\/$/,
          ""
        )}/auth/callback?error=domain_not_allowed&email=${encodeURIComponent(
          email
        )}`;
        return res.redirect(302, redirectUrl);
      }

      // Determine role: system_admin > property_custodian > student
      role = "student";
      if (isSystemAdminEmail) {
        role = "system_admin";
      } else if (isPropertyCustodian) {
        role = "property_custodian";
      }
    }

    // Ensure email is always a string in the JWT payload
    const emailString = typeof email === "string" ? email : String(email);

    // Ensure role is always set - prioritize: database > email assignment > domain check > user.role > default
    const finalRole = role || user.role || "student";
    
    // Validate that role is not null/undefined/empty
    if (!finalRole || finalRole.trim() === "") {
      console.error("[Auth Controller] ❌ CRITICAL: Role is empty after all checks!", {
        role,
        userRole: user.role,
        email: emailString,
        existingUser: existingUser ? { id: existingUser.id, role: existingUser.role } : null,
      });
      return res.status(500).json({ 
        message: "Authentication error",
        details: "Unable to determine user role. Please contact administrator."
      });
    }

    const payload = {
      id: existingUser?.id || user.id || emailString,
      email: emailString,
      role: finalRole, // Always include role in JWT payload
    };

    console.log("[Auth Controller] ✅ Creating JWT token with payload:", {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      roleSource: role ? "determined" : user.role ? "from user object" : "default (student)",
    });

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // If frontend URL is provided, redirect there with token for client-side handling
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${FRONTEND_URL.replace(
      /\/$/,
      ""
    )}/auth/callback?token=${encodeURIComponent(token)}`;

    // Redirect user to frontend callback which will store token and redirect to correct dashboard
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// We only use Google OAuth, so these endpoints are not needed
