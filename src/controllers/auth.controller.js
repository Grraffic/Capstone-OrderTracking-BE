const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

exports.oauthCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ message: "Authentication failed" });

    const email = user.email;
    if (!email) return res.status(400).json({ message: "No email present" });

    const isStudent = email.endsWith("@student.laverdad.edu.ph");
    const isAdmin = email.endsWith("@laverdad.edu.ph");

    if (!isStudent && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Email domain not allowed for this application" });
    }

    const payload = {
      id: user.id || user.email,
      email: user.email,
      role: user.role || (isAdmin ? "admin" : "student"),
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Email/password signup (server-side using service role)
exports.emailSignup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const isStudent = email.endsWith("@student.laverdad.edu.ph");
    const isAdmin = email.endsWith("@laverdad.edu.ph");

    if (!isStudent && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Email domain not allowed for signup" });
    }

    // Create user in Supabase Auth as admin (uses service key)
    const { data: createData, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true,
      });

    if (createErr) {
      console.error("Supabase createUser error:", createErr);
      return res
        .status(400)
        .json({ message: "Failed to create user", details: createErr.message });
    }

    // Upsert into users table to store role and metadata
    const role = isAdmin ? "admin" : "student";
    await supabase
      .from("users")
      .upsert(
        { email, name, role, provider: "email" },
        { onConflict: ["email"] }
      );

    return res.status(201).json({
      message: "User created",
      email: createData.user?.email || email,
    });
  } catch (err) {
    console.error("Email signup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Email/password login - uses Supabase to verify credentials then issues local JWT
exports.emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    // Sign in via Supabase
    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInErr) {
      console.error("Supabase signIn error:", signInErr);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = signInData.user;
    if (!user)
      return res.status(401).json({ message: "Authentication failed" });

    // Get role from users table if present
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("role")
      .eq("email", email)
      .maybeSingle();
    let role = userRow?.role;
    if (!role) {
      // Fallback to domain-based role
      role = email.endsWith("@laverdad.edu.ph")
        ? "admin"
        : email.endsWith("@student.laverdad.edu.ph")
        ? "student"
        : "staff";
    }

    const payload = { id: user.id, email: user.email, role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({ token, user: payload });
  } catch (err) {
    console.error("Email login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
