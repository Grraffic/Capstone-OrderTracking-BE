const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { isSpecialAdmin } = require("../config/admin");
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

    const isStudent = normalizedEmail.endsWith("@student.laverdad.edu.ph");
    // Allow standard admin domain and specific personal admin emails
    // See backend/src/config/admin.js for configuration
    const isSpecialAdminEmail = isSpecialAdmin(normalizedEmail);
    const isAdmin =
      normalizedEmail.endsWith("@laverdad.edu.ph") || isSpecialAdminEmail;

    if (!isStudent && !isAdmin) {
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

    // Ensure email is always a string in the JWT payload
    const emailString = typeof email === "string" ? email : String(email);

    const payload = {
      id: user.id || emailString,
      email: emailString,
      role: user.role || (isAdmin ? "admin" : "student"),
    };

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
