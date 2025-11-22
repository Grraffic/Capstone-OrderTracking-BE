/**
 * useDashboardData Hook
 * 
 * Handles dashboard data fetching and management:
 * - Fetches student statistics
 * - Fetches recent orders
 * - Fetches notifications
 * - Manages loading and error states
 * 
 * Usage:
 * const { stats, recentOrders, notifications, loading, error } = useDashboardData();
 */

import { useState, useEffect } from 'react';

export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    availableUniforms: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API calls
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

      setStats({
        totalOrders: 5,
        pendingOrders: 2,
        completedOrders: 3,
        availableUniforms: 12,
      });

      setRecentOrders([
        {
          id: 'ORD-001',
          type: 'School Uniform',
          item: 'PE Uniform - Size M',
          status: 'pending',
          orderDate: '2024-01-15',
          expectedDate: '2024-01-20',
        },
        {
          id: 'ORD-002',
          type: 'Event Merchandise',
          item: 'Foundation Week Shirt - Size L',
          status: 'ready',
          orderDate: '2024-01-10',
          expectedDate: '2024-01-18',
        },
        {
          id: 'ORD-003',
          type: 'School Uniform',
          item: 'Regular Uniform - Size M',
          status: 'completed',
          orderDate: '2024-01-05',
          expectedDate: '2024-01-12',
        },
      ]);

      setNotifications([
        {
          id: 1,
          type: 'order_ready',
          message: 'Your Foundation Week Shirt is ready for pickup',
          timestamp: '2024-01-18T10:30:00Z',
        },
        {
          id: 2,
          type: 'uniform_available',
          message: 'New PE Uniforms are now available in stock',
          timestamp: '2024-01-17T14:15:00Z',
        },
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    stats,
    recentOrders,
    notifications,
    loading,
    error,
    refreshData,
  };
};

