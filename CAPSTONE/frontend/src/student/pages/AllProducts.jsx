import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/common/Navbar";
import HeroSection from "../components/common/HeroSection";
import CategorySidebar from "../components/Products/CategorySidebar";
import ProductGrid from "../components/Products/ProductGrid";
import Pagination from "../components/common/Pagination";
import Footer from "../../components/common/Footer";
import { useInventory } from "../../admin/hooks/inventory/useInventory";
import { useSearchDebounce, useProductPagination } from "../hooks";

/**
 * AllProducts Component
 *
 * Student-facing product catalog page that displays available uniforms and items.
 *
 * Features:
 * - Browse all available inventory items from real API
 * - Filter by category (sidebar)
 * - Search functionality
 * - Stock status indicators (Available, Low Stock, Out of Stock)
 * - Order items with quantity selection
 * - Generate QR code receipt after order submission
 * - NO pricing information displayed (uniforms are free for students)
 * - Read-only view of inventory
 */
const AllProducts = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop sidebar collapse to icons

  // Fetch inventory data using existing hook
  const { items, loading, error } = useInventory();

  // Debounce search
  const debouncedSearch = useSearchDebounce(searchQuery, 300);

  // Transform inventory items to match product format expected by components
  const transformedProducts = useMemo(() => {
    return items.map((item) => {
      // Map inventory status to product status
      let status = "in_stock";
      const stock = item.stock || 0;

      if (stock === 0) {
        status = "out_of_stock";
      } else if (stock < 20) {
        status = "limited_stock";
      }

      return {
        id: item.id,
        name: item.name,
        type: item.itemType?.toLowerCase() || "other",
        category:
          item.category?.toLowerCase().replace(/\s+/g, "_") || "other_items",
        status: status,
        image: item.image || "/images/products/placeholder.jpg",
        price: 0, // FREE for students - price hidden
        description: item.description || item.descriptionText || "",
        educationLevel: item.educationLevel,
        itemType: item.itemType,
        stock: item.stock,
        sizes: item.sizes,
        // Keep original item data for order submission
        _originalItem: item,
      };
    });
  }, [items]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let filtered = [...transformedProducts];

    // Filter by category
    if (selectedCategory !== "all") {
      if (
        selectedCategory === "school_uniform" ||
        selectedCategory === "pe_uniform"
      ) {
        filtered = filtered.filter(
          (product) => product.category === selectedCategory
        );
      } else if (selectedCategory === "uniform") {
        filtered = filtered.filter(
          (product) =>
            product.category === "school_uniform" ||
            product.category === "pe_uniform"
        );
      } else if (selectedCategory === "other_items") {
        filtered = filtered.filter(
          (product) => product.category === "other_items"
        );
      }
    }

    // Filter by search query
    if (debouncedSearch && debouncedSearch.trim() !== "") {
      const query = debouncedSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.educationLevel?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transformedProducts, selectedCategory, debouncedSearch]);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
  } = useProductPagination(filteredProducts, 8);

  // Event handlers
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setIsSidebarOpen(false); // Close mobile sidebar after selection
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <p className="text-gray-600 text-lg">Error loading products</p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section - Fixed background, stays in place */}
      <HeroSection />

      {/* Main Content - Scrollable content that overlaps hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative z-10 pb-8">
        {/* Main Container - Solid white background */}
        <div className="bg-white rounded-3xl shadow-gray-800 shadow-md p-6 md:p-8 lg:p-10">
          {/* Header Section - Sticky */}
          <div className="sticky top-16 z-20 bg-white rounded-t-3xl pb-6 mb-2 -mx-6 -mt-6 px-6 pt-6 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Hamburger + Title */}
              <div className="flex items-center gap-4">
                {/* Hamburger Menu Button - Visible on all screen sizes */}
                <button
                  onClick={() => {
                    // On mobile: toggle sidebar visibility
                    // On desktop: toggle sidebar collapse (icon-only mode)
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(!isSidebarOpen);
                    } else {
                      setIsSidebarCollapsed(!isSidebarCollapsed);
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300"
                  aria-label="Toggle sidebar"
                >
                  {/* Hamburger Icon */}
                  <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                {/* Page Title */}
                <h1 className="text-3xl md:text-4xl font-bold">
                  <span className="text-[#003363]">All </span>
                  <span className="text-[#F28C28]">Products</span>
                </h1>
              </div>

              {/* Right: Search Bar */}
              <div className="relative w-full lg:w-96">
                <input
                  type="text"
                  placeholder="Search for items"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#003363] focus:border-transparent text-sm"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#003363] text-white p-2 rounded-full hover:bg-[#002347] transition-colors">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Category Sidebar - Desktop (always visible, collapses to icons) */}
            <div className={`hidden lg:block ${isSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
              <CategorySidebar
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                isCollapsed={isSidebarCollapsed}
              />
            </div>

            {/* Category Sidebar - Mobile (Collapsible) */}
            {isSidebarOpen && (
              <div className="lg:hidden col-span-1 mb-6">
                <CategorySidebar
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            )}

            {/* Product Grid - Smooth width transition */}
            <div 
              className={`${isSidebarCollapsed ? 'lg:col-span-11' : 'lg:col-span-9'}`}
              style={{
                transition: 'all 0.3s ease-in-out'
              }}
            >
              {/* Results Info */}
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Showing {paginatedItems.length} of {filteredProducts.length}{" "}
                  products
                  {debouncedSearch && ` for "${debouncedSearch}"`}
                </p>
                <p className="text-xs text-[#F28C28] font-semibold mt-1">
                  ✨ All items are FREE for students
                </p>
              </div>

              {/* Product Grid */}
              <ProductGrid products={paginatedItems} />

              {/* Pagination */}
              {filteredProducts.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onPrevious={prevPage}
                  onNext={nextPage}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AllProducts;
