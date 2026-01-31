const jwt = require("jsonwebtoken");
require("dotenv").config();
const supabase = require("../config/supabase");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Auth Middleware] ❌ Missing or invalid Authorization header");
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log("[Auth Middleware] ✅ Token verified, payload:", {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      allKeys: Object.keys(payload),
    });
    req.user = payload;
    return next();
  } catch (err) {
    console.error("[Auth Middleware] ❌ Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRole(requiredRoles) {
  return async function (req, res, next) {
    if (!req.user) {
      console.log("[Auth Middleware] ❌ No user in request");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    let userRole = req.user.role;
    console.log("[Auth Middleware] 🔍 Checking role:", {
      userRole,
      requiredRoles,
      userPayload: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        allKeys: Object.keys(req.user),
      },
    });
    
    // Normalize required roles for comparison
    const normalizeRole = (role) => {
      if (!role) return null;
      return String(role)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/[^a-z0-9_]/g, ""); // Remove special characters
    };
    
    const normalizedRequiredRoles = Array.isArray(requiredRoles)
      ? requiredRoles.map(r => normalizeRole(r))
      : [normalizeRole(requiredRoles)];
    
    // Check if current role matches required role
    const normalizedUserRole = normalizeRole(userRole);
    const hasRequiredRole = normalizedRequiredRoles.some(
      requiredRole => requiredRole === normalizedUserRole
    );
    
    // If role is missing from token OR doesn't match required role, fetch from database
    const shouldFetchFromDatabase = !userRole || 
                                    userRole === null || 
                                    userRole === undefined || 
                                    !hasRequiredRole;
    
    if (shouldFetchFromDatabase) {
      if (!hasRequiredRole && userRole) {
        console.log("[Auth Middleware] ⚠️ Token role doesn't match required role, fetching from database to verify:", {
          tokenRole: userRole,
          requiredRoles: requiredRoles,
        });
      } else {
        console.log("[Auth Middleware] ⚠️ Role missing from token, fetching from database...");
      }
      
      try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        const { getProfileByUserId, getProfileByEmail } = require("../services/profileResolver.service");

        let userData = null;

        const byId = await getProfileByUserId(userId);
        if (byId) {
          userData = { role: byId.type === "staff" ? byId.row.role : "student" };
          console.log("[Auth Middleware] ✅ Found profile by ID (students/staff):", { userId, role: userData.role });
        }
        if (!userData && userEmail) {
          const byEmail = await getProfileByEmail(userEmail);
          if (byEmail) {
            userData = { role: byEmail.type === "staff" ? byEmail.row.role : "student" };
            console.log("[Auth Middleware] ✅ Found profile by email (students/staff):", { email: userEmail, role: userData.role });
          }
        }
        if (userData && userData.role) {
          const dbRole = userData.role;
          const normalizedDbRole = normalizeRole(dbRole);
          const dbHasRequiredRole = normalizedRequiredRoles.some(
            requiredRole => requiredRole === normalizedDbRole
          );
          
          if (dbHasRequiredRole) {
            // Database role matches required role - use it
            userRole = dbRole;
            // Update req.user with the fetched role for future middleware
            req.user.role = userRole;
            console.log("[Auth Middleware] ✅ Role fetched from database and matches required role:", {
              databaseRole: dbRole,
              requiredRoles: requiredRoles,
            });
          } else {
            // Database role also doesn't match - user doesn't have required role
            console.error("[Auth Middleware] ❌ Database role doesn't match required role:", {
              databaseRole: dbRole,
              requiredRoles: requiredRoles,
              tokenRole: req.user.role,
            });
            return res.status(403).json({ 
              message: "Forbidden",
              details: `Access denied. Required role: ${Array.isArray(requiredRoles) ? requiredRoles.join(" or ") : requiredRoles}. Your role in database: ${dbRole}. Please contact administrator to update your role.`
            });
          }
        } else {
          console.error("[Auth Middleware] ❌ Could not find user in database:", { userId, userEmail });
          return res.status(403).json({ 
            message: "Forbidden: Role not found in token or database",
            details: "User role could not be determined. Please log in again."
          });
        }
      } catch (dbError) {
        console.error("[Auth Middleware] ❌ Database error while fetching role:", dbError);
        return res.status(500).json({ 
          message: "Internal server error",
          details: "Failed to verify user role"
        });
      }
    }
    
    // Final role check with normalized values (after potential database fetch)
    const finalNormalizedUserRole = normalizeRole(userRole);
    
    console.log("[Auth Middleware] 🔍 Final normalized role comparison:", {
      userRole: finalNormalizedUserRole,
      requiredRoles: normalizedRequiredRoles,
      originalUserRole: userRole,
      originalRequiredRoles: requiredRoles,
    });
    
    // Check if user role matches any of the required roles
    const finalHasRequiredRole = normalizedRequiredRoles.some(
      requiredRole => requiredRole === finalNormalizedUserRole
    );
    
    if (!finalHasRequiredRole) {
      console.log("[Auth Middleware] ❌ Role mismatch after all checks:", {
        userRole: finalNormalizedUserRole,
        requiredRoles: normalizedRequiredRoles,
        originalUserRole: userRole,
        originalRequiredRoles: requiredRoles,
      });
      return res.status(403).json({ 
        message: "Forbidden",
        details: `Access denied. Required role: ${Array.isArray(requiredRoles) ? requiredRoles.join(" or ") : requiredRoles}. Your role: ${userRole || "not set"}. Please contact administrator to update your role or log in again to refresh your token.`
      });
    }
    
    console.log("[Auth Middleware] ✅ Role check passed:", {
      userRole: finalNormalizedUserRole,
      matchedRequiredRole: normalizedRequiredRoles.find(r => r === finalNormalizedUserRole),
    });
    return next();
  };
}

// Middleware that allows both system_admin and property_custodian
function requireAdminOrPropertyCustodian(req, res, next) {
  return requireRole(["system_admin", "property_custodian"])(req, res, next);
}

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin: requireRole("admin"), // Keep for backward compatibility
  requirePropertyCustodian: requireRole("property_custodian"),
  requireSystemAdmin: requireRole("system_admin"),
  requireStudent: requireRole("student"),
  requireAdminOrPropertyCustodian,
};
