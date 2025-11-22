import React, { useState } from "react";
import { ArrowLeft, Search, ShoppingCart, Minus, Plus } from "lucide-react";

import ProductImageViewer from "./ProductImageViewer";
import ProductInfo from "./ProductInfo";
import SizeSelector from "./SizeSelector";
import ProductCarousel from "./ProductCarousel";

const ProductDetailsModal = ({
  isOpen,
  onClose,
  product,
  availableSizes,
  selectedSize,
  onSizeSelect,
  sizeConfirmed,
  quantity,
  onQuantityChange,
  relatedProducts,
  onProductSwitch,
  onAddToCart,
  onOrderNow,
  requiresSizeSelection,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen || !product) return null;

  const isOutOfStock = product.status === "out_of_stock";
  const isOrderDisabled =
    isOutOfStock || (requiresSizeSelection && !selectedSize);

  const handleAddToCart = () => {
    if (isOrderDisabled) return;
    onAddToCart({ product, size: selectedSize, quantity });
  };

  const handleOrderNow = () => {
    if (isOrderDisabled) return;
    onOrderNow({ product, size: selectedSize, quantity });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && relatedProducts) {
      const foundProduct = relatedProducts.find((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (foundProduct && onProductSwitch) {
        onProductSwitch(foundProduct);
        setSearchQuery("");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center p-4">
        {/* Main Container with Gradient Border */}
        <div className="relative bg-gradient-to-br from-blue-100 via-orange-100 to-blue-300 rounded-r-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden p-1">
          {/* Inner Container with White Background */}
          <div className="relative bg-white rounded-r-3xl overflow-hidden h-full">
            {/* Scrollable Content */}
            <div
              className="overflow-y-auto custom-scrollbar h-full"
              style={{ maxHeight: "90vh" }}
            >
              {/* ================= PRODUCT DETAIL SECTION ================= */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left Column: Product Image with Gradient Background */}
                <div className="relative bg-gradient-to-br from-blue-100 via-orange-100 to-blue-200 p-8">
                  {/* Logo and Education Level Badge - Top Left Overlay */}
                  <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                    <img
                      src="../../../assets/image/LV Logo.png"
                      alt="La Verdad Logo"
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg"
                    />
                    <h2 className="text-lg sm:text-xl font-bold text-[#003363] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                      Basic Education
                    </h2>
                  </div>

                  {/* Product Image Viewer */}
                  <ProductImageViewer
                    product={product}
                    selectedSize={selectedSize}
                  />
                </div>

                {/* Right Column: Product Information Card */}
                <div className="space-y-5 p-6 md:p-8 bg-white backdrop-blur-sm">
                  {/* 1. Search Bar - Full Width */}
                  <div>
                    <form onSubmit={handleSearchSubmit} className="w-full">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search for items"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-14 py-3 border-2 border-gray-300 rounded-full focus:ring-2 focus:ring-[#003363] focus:border-[#003363] text-sm transition-all"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <button
                          type="submit"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#003363] text-white p-2 rounded-full hover:bg-[#002347] transition-all shadow-md"
                        >
                          <ArrowLeft className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 2. Product Info (includes Education Level Badge, Back Button, FREE Label, Title, Description) */}
                  <ProductInfo product={product} onClose={onClose} />

                  {/* 4. Size Selector (if required) */}
                  {requiresSizeSelection && (
                    <SizeSelector
                      availableSizes={availableSizes}
                      selectedSize={selectedSize}
                      onSizeSelect={onSizeSelect}
                      sizeConfirmed={sizeConfirmed}
                    />
                  )}

                  {/* 5. Quantity Selector */}
                  {!isOutOfStock && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Quantity:
                      </h3>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => onQuantityChange(quantity - 1)}
                          disabled={quantity <= 1}
                          className="p-3 border-2 border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#F28C28] hover:bg-orange-50 transition-all"
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </button>

                        <span className="text-xl font-bold text-[#003363] min-w-[3rem] text-center">
                          {quantity}
                        </span>

                        <button
                          onClick={() => onQuantityChange(quantity + 1)}
                          className="p-3 border-2 border-gray-300 rounded-lg hover:border-[#F28C28] hover:bg-orange-50 transition-all"
                        >
                          <Plus className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleAddToCart}
                      disabled={isOrderDisabled}
                      className="flex-1 px-6 py-3 bg-white border-2 border-[#003363] text-[#003363] font-semibold rounded-full hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                    >
                      <ShoppingCart className="w-5 h-5" /> Add to Cart
                    </button>

                    <button
                      onClick={handleOrderNow}
                      disabled={isOrderDisabled}
                      className="flex-1 px-6 py-3 bg-[#F28C28] text-white font-semibold rounded-full hover:bg-[#d97a1f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                      Order Now
                    </button>
                  </div>

                  {/* Size Selection Warning */}
                  {requiresSizeSelection && !selectedSize && (
                    <p className="text-sm text-red-600 text-center font-medium">
                      ⚠️ Please select a size before ordering
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ================= OTHER PRODUCTS SECTION (SEPARATE FROM PRODUCT DETAIL) ================= */}
            <div className="px-6 md:px-8 pb-8 pt-8 bg-gray-50">
              <ProductCarousel
                products={relatedProducts}
                onProductClick={onProductSwitch}
                currentProductId={product.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
