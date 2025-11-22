import React from "react";

/**
 * ProductInfo Component
 *
 * Displays product information in simplified format
 * Matching reference design
 */
const ProductInfo = ({ product, onClose }) => {
  const isOutOfStock = product.status === "out_of_stock";

  return (
    <div className="space-y-4">
      {/* Back Button and FREE Label - Same Row */}
      <div className="flex items-center justify-between gap-4">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-[#003363] text-[#003363] hover:bg-[#003363] hover:text-white transition-all duration-200 font-semibold rounded-full"
          >
            Back
          </button>
        )}

        <span className="px-5 py-2 bg-white border-2 border-[#003363] text-[#003363] rounded-full text-sm font-bold shadow-sm">
          FREE
        </span>
      </div>

      {/* Education Level Badge - Below Back Button */}
      <div>
        <span className="inline-block px-4 py-2 bg-[#F28C28] text-white text-sm font-semibold rounded-full">
          {product.educationLevel || "All Education Levels"}
        </span>
      </div>

      {/* Product Name */}
      <h1 className="text-3xl font-bold text-[#F28C28] leading-tight">
        {product.name}
      </h1>

      {/* Complete Set Badge */}
      {(product.isCompleteSet || product.itemType === "Complete Set") && (
        <div className="flex items-center gap-2">
          <span className="text-[#003363] font-semibold text-lg">
            ✓ Complete Set
          </span>
        </div>
      )}

      {/* Education Level Restriction
      {product.educationLevel && product.educationLevel !== "All" && (
        <p className="text-[#003363] text-sm italic">
          This uniform is for{" "}
          <span className="font-bold text-[#F28C28]">
            {product.educationLevel}
          </span>{" "}
          students only.
        </p>
      )} */}

      {/* Description */}
      {product.description && (
        <div className="space-y-2">
          <p className="text-gray-700 text-sm leading-relaxed">
            {product.description}
          </p>
        </div>
      )}

      {/* Out of Stock Warning */}
      {isOutOfStock && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
          <p className="text-red-700 text-sm font-semibold">
            ⚠️ This item is currently out of stock
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
