import { useState, useEffect, useCallback } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * useOrders Hook
 *
 * Fetches and manages orders data from the backend API:
 * - Fetches all orders with filtering and pagination
 * - Provides loading and error states
 * - Supports search, status, and education level filters
 * - Handles pagination
 *
 * @param {Object} options - Configuration options
 * @param {number} options.page - Current page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.status - Filter by status
 * @param {string} options.educationLevel - Filter by education level
 * @param {string} options.search - Search term
 * @returns {Object} Orders data, loading state, error, and refetch function
 */
export const useOrders = (options = {}) => {
  const {
    page = 1,
    limit = 10,
    status = null,
    educationLevel = null,
    search = null,
  } = options;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  /**
   * Fetch orders from API
   */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (status) {
        params.append("status", status);
      }

      if (educationLevel && educationLevel !== "All Education Levels") {
        params.append("education_level", educationLevel);
      }

      if (search) {
        params.append("search", search);
      }

      // Fetch orders from API
      const response = await fetch(`${API_BASE_URL}/orders?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setOrders(result.data || []);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        });
      } else {
        throw new Error(result.message || "Failed to fetch orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, educationLevel, search]);

  /**
   * Fetch orders on mount and when dependencies change
   */
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   */
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Refresh orders after update
        await fetchOrders();
        return result.data;
      } else {
        throw new Error(result.message || "Failed to update order status");
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      throw err;
    }
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    pagination,
    refetch: fetchOrders,
    updateOrderStatus,
  };
};

export default useOrders;

