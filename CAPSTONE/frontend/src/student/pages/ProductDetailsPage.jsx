import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShoppingCart, Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/common/Navbar";
import Footer from "../../components/common/Footer";
import ProductImageViewer from "../components/Products/ProductDetails/ProductImageViewer";
import ProductInfo from "../components/Products/ProductDetails/ProductInfo";
import SizeSelector from "../components/Products/ProductDetails/SizeSelector";
import ProductCarousel from "../components/Products/ProductDetails/ProductCarousel";
import { useInventory } from "../../admin/hooks/inventory/useInventory";
import { useCart } from "../../context/CartContext";

/**
 * ProductDetailsPage Component
 *
 * Dedicated page for displaying detailed product information
 * Replaces the modal approach with a full-page view
 */
const ProductDetailsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { items: allProducts } = useInventory();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sizeConfirmed, setSizeConfirmed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load product data
  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    if (allProducts && allProducts.length > 0 && productId) {
      console.log("Looking for product with ID:", productId);
      console.log("Available products:", allProducts.length);

      const foundProduct = allProducts.find((p) => p.id === productId);

      if (foundProduct) {
        console.log("Product found:", foundProduct.name);
        setProduct(foundProduct);
        setSelectedSize("");
        setQuantity(1);
        setSizeConfirmed(false);
      } else {
        console.log("Product not found, redirecting to all products");
        // Product not found, redirect to all products
        navigate("/all-products");
      }
    }
  }, [productId, allProducts, navigate]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C28] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.status === "out_of_stock";

  // Debug: Log product data to check itemType
  console.log("Product data:", {
    name: product.name,
    itemType: product.itemType,
    category: product.category,
    educationLevel: product.educationLevel,
  });

  // Check if product requires size selection (case-insensitive check)
  const requiresSizeSelection =
    product.itemType === "Uniform" ||
    product.itemType === "PE Uniform" ||
    product.itemType?.toLowerCase().includes("uniform") ||
    product.category?.toLowerCase().includes("uniform");

  console.log("Requires size selection:", requiresSizeSelection);

  const availableSizes = requiresSizeSelection
    ? ["XS", "S", "M", "L", "XL", "XXL"]
    : [];
  const isOrderDisabled =
    isOutOfStock ||
    (requiresSizeSelection && (!selectedSize || !sizeConfirmed));

  // Get related products (same education level or item type)
  const relatedProducts = allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.educationLevel === product.educationLevel ||
          p.itemType === product.itemType)
    )
    .slice(0, 3);

  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    setSizeConfirmed(false);
  };

  const handleSizeConfirm = () => {
    setSizeConfirmed(true);
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (isOrderDisabled) return;

    try {
      await addToCart({
        inventoryId: product.id,
        size: selectedSize || "N/A",
        quantity: quantity,
      });
      // Success toast is handled by CartContext
    } catch (error) {
      console.error("Failed to add to cart:", error);
      // Error toast is also handled by CartContext
    }
  };

  const handleOrderNow = () => {
    if (isOrderDisabled) return;
    console.log("Order now:", {
      product: product.name,
      size: selectedSize,
      quantity,
    });
    alert(
      `Ordering ${quantity}x ${product.name} (Size: ${selectedSize || "N/A"})`
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && relatedProducts) {
      const foundProduct = relatedProducts.find((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (foundProduct) {
        navigate(`/products/${foundProduct.id}`);
        setSearchQuery("");
      }
    }
  };

  const handleProductSwitch = (newProduct) => {
    navigate(`/products/${newProduct.id}`);
  };

  const handleBackClick = () => {
    navigate("/all-products");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />

      {/* Background Hero Section */}
      <div className="pt-16">
        <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src="/assets/image/LandingPage.png"
              alt="La Verdad Campus"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback gradient if image fails to load
                e.target.style.display = "none";
                e.target.parentElement.style.background =
                  "linear-gradient(135deg, #003363 0%, #0C2340 100%)";
              }}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#003363]/40 to-transparent"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-8">
        {/* Product Detail Section with Gradient Border */}
        <div className="rounded-r-3xl shadow-2xl mb-8">
          <div className="bg-white rounded-r-3xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left Column: Product Image with Gradient Background */}
              <div
                className="relative p-8 min-h-[600px] flex items-center"
                style={{
                  background: `linear-gradient(
      to bottom,
      rgba(254, 254, 254, 1) 0%,
      rgba(249, 240, 227, 0.97) 11%,
      rgba(203, 123, 0, 70) 60%,
      rgba(1, 109, 211, 0.7) 100%
    )`,
                }}
              >
                {/* Logo and Education Level Badge - Top Left Overlay */}
                <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                  <img
                    src="../../../assets/image/LV Logo.png"
                    alt="La Verdad Logo"
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg"
                  />
                  <h2 className="text-lg sm:text-xl font-bold text-[#003363]  ">
                    Basic Education
                  </h2>
                </div>

                {/* Product Image Viewer */}
                <div className="w-full">
                  <ProductImageViewer
                    product={product}
                    selectedSize={selectedSize}
                  />
                </div>
              </div>

              {/* Right Column: Product Information Card */}
              <div className="space-y-5 p-6 md:p-8 bg-white">
                {/* Search Bar */}
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

                {/* Product Info (includes Education Level Badge, Back Button, FREE Label, Title, Description) */}
                <ProductInfo product={product} onClose={handleBackClick} />

                {/* Size Selector (if required) */}
                {requiresSizeSelection && (
                  <SizeSelector
                    availableSizes={availableSizes}
                    selectedSize={selectedSize}
                    onSizeSelect={handleSizeSelect}
                    sizeConfirmed={sizeConfirmed}
                    onSizeConfirm={handleSizeConfirm}
                  />
                )}

                {/* Quantity Selector */}
                {!isOutOfStock && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Quantity:
                    </h3>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="p-3 border-2 border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#F28C28] hover:bg-orange-50 transition-all"
                      >
                        <Minus className="w-4 h-4 text-gray-700" />
                      </button>

                      <span className="text-xl font-bold text-[#003363] min-w-[3rem] text-center">
                        {quantity}
                      </span>

                      <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="p-3 border-2 border-gray-300 rounded-lg hover:border-[#F28C28] hover:bg-orange-50 transition-all"
                      >
                        <Plus className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons - Right Aligned */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOrderDisabled}
                    className="px-5 py-2 bg-white border-2 border-[#003363] text-[#003363] font-semibold rounded-full hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md text-sm"
                  >
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </button>

                  <button
                    onClick={handleOrderNow}
                    disabled={isOrderDisabled}
                    className="px-6 py-2 bg-[#F28C28] text-white font-semibold rounded-full hover:bg-[#d97a1f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-sm"
                  >
                    Order Now
                  </button>
                </div>

                {/* Size Selection Warning
                {requiresSizeSelection && (!selectedSize || !sizeConfirmed) && (
                  <p className="text-sm text-red-600 text-center font-medium">
                    {!selectedSize
                      ? "⚠️ Please select a size before ordering"
                      : "⚠️ Please confirm your size selection before ordering"}
                  </p>
                )} */}
              </div>
            </div>
          </div>
        </div>

        {/* Other Products Section - Completely Separate */}
        <div className=" rounded-2xl shadow-lg p-6 md:p-8">
          <ProductCarousel
            products={relatedProducts}
            onProductClick={handleProductSwitch}
            currentProductId={product.id}
          />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProductDetailsPage;
