/**
 * useRoleSelection Hook
 * 
 * Manages role selection for login:
 * - Tracks selected role
 * - Provides role information
 * - Handles role switching
 * 
 * Usage:
 * const { role, selectRole, getRoleInfo, availableRoles } = useRoleSelection();
 */

import { useState } from 'react';

// Role definitions
const ROLES = {
  STUDENT: 'Student',
  ADMIN: 'Coordinator',
};

const ROLE_INFO = {
  [ROLES.STUDENT]: {
    label: 'Student',
    description: 'You can now access the user side of the site',
    portal: 'Student Portal',
    icon: 'user',
  },
  [ROLES.ADMIN]: {
    label: 'Coordinator',
    description: 'You can now manage and coordinate the site',
    portal: 'Coordinator Portal',
    icon: 'admin',
  },
};

export const useRoleSelection = (defaultRole = ROLES.STUDENT) => {
  const [selectedRole, setSelectedRole] = useState(defaultRole);

  /**
   * Select a role
   * @param {string} role - Role to select
   */
  const selectRole = (role) => {
    if (Object.values(ROLES).includes(role)) {
      setSelectedRole(role);
    }
  };

  /**
   * Get information about a role
   * @param {string} role - Role to get info for
   * @returns {Object} - Role information
   */
  const getRoleInfo = (role = selectedRole) => {
    return ROLE_INFO[role] || ROLE_INFO[ROLES.STUDENT];
  };

  /**
   * Get all available roles
   * @returns {Array} - Array of available roles
   */
  const getAvailableRoles = () => {
    return Object.values(ROLES);
  };

  /**
   * Check if role is selected
   * @param {string} role - Role to check
   * @returns {boolean}
   */
  const isRoleSelected = (role) => {
    return selectedRole === role;
  };

  /**
   * Get current role info
   * @returns {Object} - Current role information
   */
  const getCurrentRoleInfo = () => {
    return getRoleInfo(selectedRole);
  };

  /**
   * Reset to default role
   */
  const resetRole = () => {
    setSelectedRole(defaultRole);
  };

  return {
    role: selectedRole,
    selectRole,
    getRoleInfo,
    getAvailableRoles,
    isRoleSelected,
    getCurrentRoleInfo,
    resetRole,
    ROLES,
  };
};

