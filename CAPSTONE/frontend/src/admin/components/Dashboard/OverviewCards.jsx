import {
  ShoppingCart,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

/**
 * OverviewCards Component
 *
 * Displays 4 overview cards in a responsive grid showing key metrics:
 * - Total Orders
 * - Items Below Reorder Point
 * - Critical Stock Items
 * - Out of Stock
 *
 * Each card has a circular icon on the left and metric value on the right
 *
 * Responsive Layout:
 * - Mobile (<768px): 1 column (full width)
 * - Tablet (768px-1023px): 2 columns
 * - Desktop (≥1024px): 2 columns
 *
 * Props:
 * - stats: Object containing totalOrders, itemsBelowReorder, criticalStock, outOfStock
 */
const OverviewCards = ({ stats }) => {
  const cards = [
    {
      id: 1,
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      accentColor: "#fbbf24",
      bgColor: "bg-yellow-50",
    },
    {
      id: 2,
      title: "Items Below Reorder Point",
      value: stats.itemsBelowReorder,
      icon: AlertCircle,
      accentColor: "#3b82f6",
      bgColor: "bg-blue-50",
    },
    {
      id: 3,
      title: "Critical Stock Items",
      value: stats.criticalStock,
      icon: AlertTriangle,
      accentColor: "#f59e0b",
      bgColor: "bg-orange-50",
    },
    {
      id: 4,
      title: "Out of Stock",
      value: stats.outOfStock,
      icon: XCircle,
      accentColor: "#a855f7",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className={`${card.bgColor} rounded-lg p-4 sm:p-6 shadow-md flex items-center gap-4 sm:gap-6 transition-all duration-200 hover:shadow-lg`}
          >
            {/* Circular Icon */}
            <div
              className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: card.accentColor }}
            >
              <IconComponent size={24} className="text-white sm:w-8 sm:h-8" />
            </div>

            {/* Metric Value and Label */}
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-4xl font-bold text-[#0C2340] mb-1 truncate">
                {card.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                {card.title}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewCards;
