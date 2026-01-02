const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(requiredRoles) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = req.user.role;
    if (Array.isArray(requiredRoles)) {
      if (!requiredRoles.includes(userRole))
        return res.status(403).json({ message: "Forbidden" });
    } else {
      if (userRole !== requiredRoles)
        return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin: requireRole("admin"), // Keep for backward compatibility
  requirePropertyCustodian: requireRole("property_custodian"),
  requireSystemAdmin: requireRole("system_admin"),
  requireStudent: requireRole("student"),
};
