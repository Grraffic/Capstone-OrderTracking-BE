const { sql } = require("../../config/database");

/**
 * Permission Service
 * 
 * Handles all database operations for permissions management
 */

/**
 * Get all permissions grouped by category
 * @returns {Promise<Array>} Array of permissions grouped by category
 */
async function getAllPermissions() {
  try {
    const permissions = await sql`
      SELECT 
        id,
        name,
        display_name,
        description,
        category,
        created_at,
        updated_at
      FROM permissions
      ORDER BY category, display_name
    `;

    // Group by category
    const grouped = permissions.reduce((acc, permission) => {
      const category = permission.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    return grouped;
  } catch (error) {
    // Check if it's a table doesn't exist error (PostgreSQL error codes: 42P01 = undefined_table)
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    if (errorCode === '42P01' || errorMessage.toLowerCase().includes('does not exist') || (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist'))) {
      console.error("⚠️  permissions table does not exist. Please run the migration: backend/migrations/create_permissions_system.sql");
      throw new Error("Permissions system not initialized. Please run the create_permissions_system.sql migration first.");
    }
    console.error("Error in getAllPermissions:", error);
    throw error;
  }
}

/**
 * Get permissions for a specific role
 * @param {string} role - Role name
 * @returns {Promise<Array>} Array of permission objects
 */
async function getPermissionsByRole(role) {
  try {
    const permissions = await sql`
      SELECT 
        p.id,
        p.name,
        p.display_name,
        p.description,
        p.category,
        p.created_at,
        p.updated_at
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role = ${role}
      ORDER BY p.category, p.display_name
    `;

    return permissions;
  } catch (error) {
    // Check if it's a table doesn't exist error (PostgreSQL error codes: 42P01 = undefined_table)
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    if (errorCode === '42P01' || errorMessage.toLowerCase().includes('does not exist') || (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist'))) {
      console.error("⚠️  permissions or role_permissions table does not exist. Please run the migration: backend/migrations/create_permissions_system.sql");
      throw new Error("Permissions system not initialized. Please run the create_permissions_system.sql migration first.");
    }
    console.error("Error in getPermissionsByRole:", error);
    throw error;
  }
}

/**
 * Assign a permission to a role
 * @param {string} role - Role name
 * @param {string} permissionId - Permission UUID
 * @returns {Promise<Object>} Created role_permission record
 */
async function assignPermissionToRole(role, permissionId) {
  try {
    const result = await sql`
      INSERT INTO role_permissions (role, permission_id)
      VALUES (${role}, ${permissionId})
      ON CONFLICT (role, permission_id) DO NOTHING
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error("Error in assignPermissionToRole:", error);
    throw error;
  }
}

/**
 * Remove a permission from a role
 * @param {string} role - Role name
 * @param {string} permissionId - Permission UUID
 * @returns {Promise<boolean>} Success status
 */
async function removePermissionFromRole(role, permissionId) {
  try {
    const result = await sql`
      DELETE FROM role_permissions
      WHERE role = ${role} AND permission_id = ${permissionId}
      RETURNING *
    `;

    return result.length > 0;
  } catch (error) {
    console.error("Error in removePermissionFromRole:", error);
    throw error;
  }
}

/**
 * Get all permissions as a flat array
 * @returns {Promise<Array>} Array of all permissions
 */
async function getAllPermissionsFlat() {
  try {
    const permissions = await sql`
      SELECT 
        id,
        name,
        display_name,
        description,
        category,
        created_at,
        updated_at
      FROM permissions
      ORDER BY category, display_name
    `;

    return permissions;
  } catch (error) {
    console.error("Error in getAllPermissionsFlat:", error);
    throw error;
  }
}

module.exports = {
  getAllPermissions,
  getAllPermissionsFlat,
  getPermissionsByRole,
  assignPermissionToRole,
  removePermissionFromRole,
};
