import { useState, useCallback } from "react";

/**
 * useAdminDashboardData Hook
 *
 * Manages admin dashboard state including:
 * - Overview statistics (total orders, items below reorder, critical stock, out of stock)
 * - Stock levels data for chart visualization
 * - Recent orders data for table display
 * - Sidebar toggle state
 * - Active tab selection
 */
export const useAdminDashboardData = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Year");

  // Overview statistics
  const overviewStats = {
    totalOrders: 250,
    itemsBelowReorder: 50,
    criticalStock: 23,
    outOfStock: 11,
  };

  // Stock levels data for chart
  const stockLevelsData = [
    {
      name: "Kinder Dress",
      "Above Threshold": 250,
      "At Reorder Point": 0,
      Critical: 0,
      "Out of Stock": 0,
    },
    {
      name: "Kinder Shorts",
      "Above Threshold": 0,
      "At Reorder Point": 50,
      Critical: 0,
      "Out of Stock": 0,
    },
    {
      name: "Kinder Shorts",
      "Above Threshold": 200,
      "At Reorder Point": 0,
      Critical: 0,
      "Out of Stock": 0,
    },
    {
      name: "Necktie",
      "Above Threshold": 0,
      "At Reorder Point": 0,
      Critical: 0,
      "Out of Stock": 10,
    },
  ];

  // Recent orders data
  const recentOrders = [
    {
      id: 1,
      transactionNo: "1562",
      itemOrdered: "Blouse",
      description: "Small",
      moreItems: "more 1 item",
      name: "Lenie Jane Tinaga",
      gradeOrProgram: "BSIS 4",
      transactionDate: "08-02-2025",
    },
    {
      id: 2,
      transactionNo: "1563",
      itemOrdered: "Skirt",
      description: "Medium",
      moreItems: "more 1 item",
      name: "Astrid Borja",
      gradeOrProgram: "BSIS 4",
      transactionDate: "08-02-2025",
    },
    {
      id: 3,
      transactionNo: "1564",
      itemOrdered: "Pants",
      description: "Large",
      moreItems: "more 1 item",
      name: "Rafael Ramos",
      gradeOrProgram: "BSIS 4",
      transactionDate: "08-02-2025",
    },
    {
      id: 4,
      transactionNo: "1565",
      itemOrdered: "Necktie",
      description: "None",
      moreItems: "more 1 item",
      name: "Alicia Jane Medina",
      gradeOrProgram: "BSIS 4",
      transactionDate: "08-02-2025",
    },
  ];

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Change active tab
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return {
    sidebarOpen,
    toggleSidebar,
    activeTab,
    handleTabChange,
    overviewStats,
    stockLevelsData,
    recentOrders,
  };
};
