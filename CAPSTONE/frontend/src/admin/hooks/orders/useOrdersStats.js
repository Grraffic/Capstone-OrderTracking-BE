import { useMemo } from "react";

/**
 * Custom hook to calculate orders statistics
 * 
 * Calculates various statistics from orders data:
 * - Total cost summary
 * - Status counts (pending, processing, completed, claimed, cancelled)
 * - Unreleased quantity
 * - Released quantity
 * - Processing count
 * - Claimed count
 * 
 * @param {Array} orders - Array of order objects
 * @returns {Object} Statistics object with all calculated values
 */
const useOrdersStats = (orders) => {
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalCost: 0,
        pendingCount: 0,
        processingCount: 0,
        completedCount: 0,
        claimedCount: 0,
        cancelledCount: 0,
        unreleasedQuantity: 0,
        releasedQuantity: 0,
      };
    }

    // Calculate total cost
    const totalCost = orders.reduce((sum, order) => {
      return sum + (parseFloat(order.totalAmount) || 0);
    }, 0);

    // Count orders by status
    const pendingCount = orders.filter(
      (order) => order.status?.toLowerCase() === "pending"
    ).length;

    const processingCount = orders.filter(
      (order) => order.status?.toLowerCase() === "processing"
    ).length;

    const completedCount = orders.filter(
      (order) => order.status?.toLowerCase() === "completed"
    ).length;

    const claimedCount = orders.filter(
      (order) => order.status?.toLowerCase() === "claimed"
    ).length;

    const cancelledCount = orders.filter(
      (order) => order.status?.toLowerCase() === "cancelled"
    ).length;

    // Calculate unreleased quantity (pending + processing)
    const unreleasedQuantity = orders.filter(
      (order) =>
        order.status?.toLowerCase() === "pending" ||
        order.status?.toLowerCase() === "processing"
    ).length;

    // Calculate released quantity (completed + claimed)
    const releasedQuantity = orders.filter(
      (order) =>
        order.status?.toLowerCase() === "completed" ||
        order.status?.toLowerCase() === "claimed"
    ).length;

    return {
      totalCost,
      pendingCount,
      processingCount,
      completedCount,
      claimedCount,
      cancelledCount,
      unreleasedQuantity,
      releasedQuantity,
    };
  }, [orders]);

  return stats;
};

export default useOrdersStats;

