/**
 * useOrderStatus Hook
 *
 * Provides utilities for order status display:
 * - Maps status to color classes
 * - Maps status to icons
 * - Provides status labels
 *
 * Usage:
 * const { getStatusColor, getStatusIcon, getStatusLabel } = useOrderStatus();
 */

import { Clock, CheckCircle, Package, AlertCircle } from "lucide-react";

export const useOrderStatus = () => {
  /**
   * Get Tailwind color classes for order status
   * @param {string} status - Order status (pending, ready, completed, etc.)
   * @returns {string} - Tailwind CSS classes
   */
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "ready":
        return "text-green-600 bg-green-100";
      case "completed":
        return "text-blue-600 bg-blue-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  /**
   * Get icon component for order status
   * @param {string} status - Order status
   * @returns {JSX.Element} - Icon component
   */
  // const getStatusIcon = (status) => {
  //   const iconProps = { className: "h-4 w-4" };

  //   switch (status) {
  //     case "pending":
  //       return <Clock {...iconProps} />;
  //     case "ready":
  //       return <CheckCircle {...iconProps} />;
  //     case "completed":
  //       return <Package {...iconProps} />;
  //     case "cancelled":
  //       return <AlertCircle {...iconProps} />;
  //     default:
  //       return <AlertCircle {...iconProps} />;
  //   }
  // };

  /**
   * Get human-readable label for order status
   * @param {string} status - Order status
   * @returns {string} - Status label
   */
  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      ready: "Ready for Pickup",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  /**
   * Check if order status is actionable
   * @param {string} status - Order status
   * @returns {boolean} - Whether user can take action
   */
  const isActionable = (status) => {
    return ["pending", "ready"].includes(status);
  };

  /**
   * Get next possible status for an order
   * @param {string} currentStatus - Current order status
   * @returns {string} - Next status
   */
  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      pending: "ready",
      ready: "completed",
      completed: "completed",
      cancelled: "cancelled",
    };

    return statusFlow[currentStatus] || currentStatus;
  };

  return {
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
    isActionable,
    getNextStatus,
  };
};
