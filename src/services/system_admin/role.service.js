const { sql } = require("../../config/database");

/**
 * Role Service
 * 
 * Handles all database operations for role management
 */

// Role metadata for display
const ROLE_METADATA = {
  student: {
    displayName: "Student",
    description: "Default role for students. Can view and order products.",
    icon: "user",
    color: "blue",
  },
  property_custodian: {
    displayName: "Property Custodian",
    description: "Manage uniforms, inventory, and order processing.",
    icon: "shield",
    color: "orange",
  },
  finance_staff: {
    displayName: "Finance Staff",
    description: "Review and approve financial aspects of orders.",
    icon: "user",
    color: "purple",
  },
  accounting_staff: {
    displayName: "Accounting Staff",
    description: "View orders and logs for auditing and records.",
    icon: "file-text",
    color: "red",
  },
  department_head: {
    displayName: "Department Head",
    description: "Monitor orders and inventory for oversight.",
    icon: "shield",
    color: "dark-blue",
  },
  system_admin: {
    displayName: "System Admin",
    description: "Full system access and configuration control.",
    icon: "user-cog",
    color: "yellow",
  },
};

/**
 * Get all roles with user counts and permission counts
 * @returns {Promise<Array>} Array of role objects with stats
 */
async function getAllRoles() {
  try {
    // Get all valid roles
    const roles = Object.keys(ROLE_METADATA);

    // Get user counts for each role
    let allUserCounts = [];
    try {
      allUserCounts = await sql`
        SELECT 
          role,
          COUNT(*) as user_count
        FROM users
        GROUP BY role
      `;
    } catch (error) {
      console.error("Error fetching user counts:", error.message);
      // Continue with empty array if users table query fails
    }

    // Get permission counts for each role
    let allPermissionCounts = [];
    try {
      allPermissionCounts = await sql`
        SELECT 
          role,
          COUNT(*) as permission_count
        FROM role_permissions
        GROUP BY role
      `;
    } catch (error) {
      // Check if it's a table doesn't exist error (PostgreSQL error codes: 42P01 = undefined_table)
      const errorMessage = error.message || '';
      const errorCode = error.code || '';
      if (errorCode === '42P01' || errorMessage.toLowerCase().includes('does not exist') || errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist')) {
        console.error("⚠️  role_permissions table does not exist. Please run the migration: backend/migrations/create_permissions_system.sql");
        throw new Error("Permissions system not initialized. Please run the create_permissions_system.sql migration first.");
      }
      console.error("Error fetching permission counts:", error.message);
      // Continue with empty array if role_permissions table query fails
    }

    // Filter to only include valid roles
    const userCounts = allUserCounts.filter(row => roles.includes(row.role));
    const permissionCounts = allPermissionCounts.filter(row => roles.includes(row.role));

    // Create a map for quick lookup
    const userCountMap = {};
    userCounts.forEach((row) => {
      userCountMap[row.role] = parseInt(row.user_count) || 0;
    });

    const permissionCountMap = {};
    permissionCounts.forEach((row) => {
      permissionCountMap[row.role] = parseInt(row.permission_count) || 0;
    });

    // Combine metadata with counts
    const rolesWithStats = roles.map((role) => {
      const metadata = ROLE_METADATA[role];
      return {
        role,
        displayName: metadata.displayName,
        description: metadata.description,
        icon: metadata.icon,
        color: metadata.color,
        userCount: userCountMap[role] || 0,
        permissionCount: permissionCountMap[role] || 0,
        isActive: true, // For now, all roles are active
      };
    });

    return rolesWithStats;
  } catch (error) {
    console.error("Error in getAllRoles:", error);
    throw error;
  }
}

/**
 * Get role details with permissions list
 * @param {string} role - Role name
 * @returns {Promise<Object>} Role object with permissions
 */
async function getRoleDetails(role) {
  try {
    const metadata = ROLE_METADATA[role];
    if (!metadata) {
      throw new Error(`Role ${role} not found`);
    }

    // Get user count
    const userCountResult = await sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = ${role}
    `;
    const userCount = parseInt(userCountResult[0]?.count || 0);

    // Get permissions
    let permissions = [];
    try {
      permissions = await sql`
        SELECT 
          p.id,
          p.name,
          p.display_name,
          p.description,
          p.category
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role = ${role}
        ORDER BY p.category, p.display_name
      `;
    } catch (error) {
      // Check if it's a table doesn't exist error (PostgreSQL error codes: 42P01 = undefined_table)
      const errorMessage = error.message || '';
      const errorCode = error.code || '';
      if (errorCode === '42P01' || errorMessage.toLowerCase().includes('does not exist') || (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist'))) {
        console.error("⚠️  permissions or role_permissions table does not exist. Please run the migration: backend/migrations/create_permissions_system.sql");
        throw new Error("Permissions system not initialized. Please run the create_permissions_system.sql migration first.");
      }
      throw error;
    }

    return {
      role,
      displayName: metadata.displayName,
      description: metadata.description,
      icon: metadata.icon,
      color: metadata.color,
      userCount,
      permissionCount: permissions.length,
      permissions,
      isActive: true,
    };
  } catch (error) {
    console.error("Error in getRoleDetails:", error);
    throw error;
  }
}

/**
 * Get user count for a role
 * @param {string} role - Role name
 * @returns {Promise<number>} User count
 */
async function getRoleUserCount(role) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = ${role}
    `;

    return parseInt(result[0]?.count || 0);
  } catch (error) {
    console.error("Error in getRoleUserCount:", error);
    throw error;
  }
}

/**
 * Get permission count for a role
 * @param {string} role - Role name
 * @returns {Promise<number>} Permission count
 */
async function getRolePermissionCount(role) {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM role_permissions
      WHERE role = ${role}
    `;

    return parseInt(result[0]?.count || 0);
  } catch (error) {
    console.error("Error in getRolePermissionCount:", error);
    throw error;
  }
}

/**
 * Update role status (for future use)
 * @param {string} role - Role name
 * @param {boolean} isActive - Active status
 * @returns {Promise<boolean>} Success status
 */
async function updateRoleStatus(role, isActive) {
  // For now, all roles are active
  // This can be extended in the future if we add an is_active column
  return true;
}

module.exports = {
  getAllRoles,
  getRoleDetails,
  getRoleUserCount,
  getRolePermissionCount,
  updateRoleStatus,
  ROLE_METADATA,
};
