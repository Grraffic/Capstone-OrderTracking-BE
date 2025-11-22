/**
 * Shared Hooks Index
 *
 * Central export file for shared custom hooks used across the application.
 * This file provides easy access to business logic hooks that are used by
 * both admin and student sides, or by shared components.
 *
 * Organized by category:
 * - Authentication: Login, redirect, and role management hooks
 * - Dashboard: Student dashboard data hooks
 * - Product: Product categories and pagination hooks (student-side)
 * - UI: Scroll and navigation utility hooks
 *
 * Note: Admin-specific hooks are in admin/hooks/index.js
 * Note: Student-specific hooks are in student/hooks/index.js
 *
 * Usage:
 * import { useLogin, useDashboardData, useProductCategories } from '../hooks';
 */

// Authentication Hooks (Shared)
export { useLogin } from "./useLogin";
export { useLoginRedirect } from "./useLoginRedirect";
export { useLoginForm } from "./useLoginForm";
export { useRoleSelection } from "./useRoleSelection";

// Dashboard Hooks (Student)
export { useDashboardData } from "./useDashboardData";
export { useOrderStatus } from "./useOrderStatus";

// Product Hooks (Student)
export { useProductCategories } from "./useProductCategories";
export { useProductPagination } from "./useProductPagination";

// UI Hooks (Shared)
export { useScrollOnState } from "./useScrollOnState";
export { useNavigateToSection } from "./useNavigateToSection";
