import React from "react";
import { Star } from "lucide-react";
import { PRODUCT_STATUS } from "../../constants/studentProducts";

const TopPicks = ({ products, onProductClick }) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-20 space-y-4">
      {/* Scrollable container with fixed height and custom scrollbar */}
      <div
        className="space-y-4 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 custom-scrollbar"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#d1d5db #f3f4f6",
        }}
      >
        {products.map((product) => {
          const statusInfo =
            PRODUCT_STATUS[product.status] || PRODUCT_STATUS.in_stock;

          return (
            <div
              key={product.id}
              onClick={() => onProductClick(product)}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden border border-gray-100"
            >
              {/* Product Image */}
              <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[#003363] line-clamp-2 mb-2">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  {product.category || "Uniform"}
                </p>
                <button
                  onClick={() => onProductClick(product)}
                  className="w-full px-5 py-2.5 bg-[#F28C28] text-white text-sm font-bold rounded-full hover:bg-[#d97a1f] transition-colors shadow-sm hover:shadow-md"
                >
                  Order Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopPicks;
