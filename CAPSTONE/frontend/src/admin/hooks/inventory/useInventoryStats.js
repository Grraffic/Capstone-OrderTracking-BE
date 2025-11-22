import { useMemo } from "react";

/**
 * useInventoryStats Hook
 *
 * Calculates inventory statistics from filtered items:
 * - Total Items count
 * - Above Threshold items count (stock >= 50)
 * - At Reorder Point items count (stock 20-49)
 * - Critical items count (stock 1-19)
 * - Out of Stock items count (stock = 0)
 *
 * @param {Array} filteredItems - Array of filtered inventory items
 * @returns {Object} Statistics object with totalItems, aboveThreshold, atReorderPoint, critical, outOfStock
 *
 * Usage:
 * const stats = useInventoryStats(filteredItems);
 */
export const useInventoryStats = (filteredItems) => {
  const stats = useMemo(() => {
    const totalItems = filteredItems.length;
    const aboveThreshold = filteredItems.filter(
      (item) => item.status === "Above Threshold"
    ).length;
    const atReorderPoint = filteredItems.filter(
      (item) => item.status === "At Reorder Point"
    ).length;
    const critical = filteredItems.filter(
      (item) => item.status === "Critical"
    ).length;
    const outOfStock = filteredItems.filter(
      (item) => item.status === "Out of Stock"
    ).length;

    return {
      totalItems,
      aboveThreshold,
      atReorderPoint,
      critical,
      outOfStock,
    };
  }, [filteredItems]);

  return stats;
};
