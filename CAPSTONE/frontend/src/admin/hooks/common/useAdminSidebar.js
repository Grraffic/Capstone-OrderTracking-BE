import { useState, useCallback } from "react";

/**
 * useAdminSidebar Hook
 *
 * Manages admin sidebar state and toggle functionality:
 * - Sidebar open/close state
 * - Toggle function to switch between open and closed states
 *
 * @param {boolean} initialState - Initial sidebar state (default: true)
 * @returns {Object} Object containing sidebarOpen state and toggleSidebar function
 *
 * Usage:
 * const { sidebarOpen, toggleSidebar } = useAdminSidebar();
 */
export const useAdminSidebar = (initialState = true) => {
  const [sidebarOpen, setSidebarOpen] = useState(initialState);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return {
    sidebarOpen,
    toggleSidebar,
  };
};

