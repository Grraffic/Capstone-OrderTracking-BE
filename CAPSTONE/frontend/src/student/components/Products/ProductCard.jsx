import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { PRODUCT_STATUS } from "../../constants/studentProducts";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const statusInfo = PRODUCT_STATUS[product.status] || PRODUCT_STATUS.in_stock;
  const isOutOfStock = product.status === "out_of_stock";
  const isPreOrder = product.status === "pre_order";

  const handleProductClick = () => {
    console.log(
      "Product card clicked, navigating to:",
      `/products/${product.id}`
    );
    console.log("Product ID:", product.id);
    // Navigate to product details page when clicking on the card
    navigate(`/products/${product.id}`);
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer"
      onClick={handleProductClick}
      style={{
        transition: 'all 0.3s ease-in-out, transform 0.3s ease-in-out'
      }}
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-50">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />

        {/* Status Badge - Top Left for Pre-Order */}
        {isPreOrder && (
          <div className="absolute top-3 left-3">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-[#F28C28] text-white shadow-md">
              Pre-Order
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Product Name */}
        <h3 className="text-lg font-bold text-[#003363] line-clamp-2 min-h-[3.5rem] leading-tight">
          {product.name}
        </h3>

        {/* Education Level */}
        {product.educationLevel && (
          <p className="text-base text-[#F28C28] font-semibold -mt-8">
            ({product.educationLevel})
          </p>
        )}

        {/* Spacer to push status to bottom */}
        <div className="flex-grow"></div>

        {/* Stock Status - Only show for out of stock items */}
        {isOutOfStock && (
          <div className="mt-3">
            <div className="flex flex-col">
              <span className="text-xs text-red-600 font-semibold">
                Out of Stock
              </span>
              <button className="flex items-center gap-1 text-xs text-[#003363] hover:text-[#F28C28] transition-colors mt-1">
                <Bell size={12} />
                <span>Remind me</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
