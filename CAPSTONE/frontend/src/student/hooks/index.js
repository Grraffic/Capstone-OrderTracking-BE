/**
 * Student Hooks Index
 *
 * Central export file for all student-specific custom hooks.
 * This file provides easy access to student business logic hooks.
 *
 * Organized by feature domain:
 * - common: Shared hooks used across multiple features
 * - products: Product browsing and filtering hooks
 * - orders: Order submission and management hooks
 * - dashboard: Dashboard data hooks
 *
 * Usage:
 * import { useProducts, useProductDetails, useOrderSubmission } from '../hooks';
 */

// Common Hooks
export { useSearchDebounce } from "./common/useSearchDebounce";

// Product Hooks
export { useProducts } from "./products/useProducts";
export { useProductDetails } from "./products/useProductDetails";
export { useProductFilter } from "./products/useProductFilter";
export { useProductPagination } from "./products/useProductPagination";

// Order Hooks
export { useOrderSubmission } from "./orders/useOrderSubmission";

// Cart Hooks
export { useCart } from "./cart/useCart";
