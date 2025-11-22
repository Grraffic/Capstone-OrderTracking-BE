/**
 * Admin Hooks Index
 *
 * Central export file for all admin-specific custom hooks.
 * This file provides easy access to admin business logic hooks.
 *
 * Organized by feature domain:
 * - common: Shared hooks used across multiple features
 * - inventory: Inventory management hooks
 * - orders: Order management hooks
 * - settings: Settings and profile hooks
 *
 * Usage:
 * import { useInventoryStats, useAdminSidebar, useQRScanner, useItemAdjustmentForm, useInventoryModalForm, useOrdersStats, useOrdersFilters, useAdminProfile } from '../hooks';
 */

// Common Hooks
export { useAdminSidebar } from "./common/useAdminSidebar";

// Dashboard Hooks
export { useAdminDashboardData } from "./dashboard/useAdminDashboardData";

// Inventory Hooks
export { useInventoryStats } from "./inventory/useInventoryStats";
export { useItemAdjustmentForm } from "./inventory/useItemAdjustmentForm";
export { useInventoryModalForm } from "./inventory/useInventoryModalForm";
export { useQRScanner } from "./inventory/useQRScanner";
export { useInventory } from "./inventory/useInventory";

// Orders Hooks
export { default as useOrdersStats } from "./orders/useOrdersStats";
export { default as useOrdersFilters } from "./orders/useOrdersFilters";
export { useOrders } from "./orders/useOrders";
export { useOrderQRScanner } from "./orders/useOrderQRScanner";

// Settings Hooks
export { useAdminProfile } from "./settings/useAdminProfile";
