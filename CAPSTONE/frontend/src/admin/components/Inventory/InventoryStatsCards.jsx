import React from "react";

/**
 * InventoryStatsCards Component
 *
 * Displays inventory statistics in a responsive grid of cards:
 * - Total Items
 * - Above Threshold (stock >= 50)
 * - At Reorder Point (stock 20-49)
 * - Critical (stock 1-19)
 * - Out of Stock (stock = 0)
 *
 * Responsive Layout:
 * - Mobile (<640px): 1 column (stacked)
 * - Tablet (640px-1023px): 2 columns
 * - Desktop (≥1024px): 5 columns (single row)
 *
 * Props:
 * - stats: Object containing { totalItems, aboveThreshold, atReorderPoint, critical, outOfStock }
 */
const InventoryStatsCards = ({ stats }) => {
  const cards = [
    {
      id: 1,
      title: "Total Items",
      value: stats.totalItems || 0,
      color: "text-[#0C2340]",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      id: 2,
      title: "Above Threshold",
      value: stats.aboveThreshold || 0,
      color: "text-green-600",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 3,
      title: "At Reorder Point",
      value: stats.atReorderPoint || 0,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    {
      id: 4,
      title: "Critical",
      value: stats.critical || 0,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 5,
      title: "Out of Stock",
      value: stats.outOfStock || 0,
      color: "text-red-600",
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
            <div
              className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center ${card.iconColor}`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryStatsCards;
