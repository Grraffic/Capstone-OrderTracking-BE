import React from "react";
import { useProductCategories } from "../../hooks/useProductCategories";
import { useProductPagination } from "../../hooks/useProductPagination";

const ProductCategories = () => {
  // Extract business logic into hooks
  const {
    categories,
    selectedCategory,
    selectCategory,
    getFilteredProducts,
    hasSubcategories,
  } = useProductCategories();

  const filteredProducts = getFilteredProducts();
  const {
    paginatedItems: productCards,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = useProductPagination(filteredProducts, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gradient-to-b from-[#fefefe] to-[rgba(243,243,243,0.95)]">
        <div className="absolute inset-0">
          <img
            src="/assets/hero-bg.jpg"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        <div className="relative z-10 container mx-auto pt-32">
          <h1 className="text-[200px] text-white opacity-80 tracking-tight text-right font-medium">
            Order Items
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto -mt-16 relative z-20">
        <div className="bg-white rounded-[50px] shadow-lg p-8">
          {/* Categories Section */}
          <div className="flex flex-col gap-4 w-[250px]">
            <button
              onClick={() => selectCategory("All Products")}
              className={`rounded-[20px] px-4 py-2 ${
                selectedCategory === "All Products"
                  ? "bg-[#003363] text-white"
                  : "text-[#003363] hover:text-[#e68b00]"
              }`}
            >
              All Products
            </button>
            {categories.map((category, index) => (
              <div key={index}>
                <button
                  onClick={() => selectCategory(category.title)}
                  className={`text-[30px] font-normal ${
                    selectedCategory === category.title
                      ? "text-[#e68b00]"
                      : "text-[#003363] hover:text-[#e68b00]"
                  }`}
                >
                  {category.title}
                </button>
                {hasSubcategories(category.title) && (
                  <div className="pl-4 mt-2 flex flex-col gap-2">
                    {category.subCategories.map((sub, idx) => (
                      <button
                        key={idx}
                        className="text-[#003363]/60 hover:text-[#e68b00] text-left"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-3 gap-8 mt-8">
            {productCards.map((product) => (
              <div
                key={product.id}
                className="bg-[#f3f3f3] rounded-[20px] p-4 relative"
              >
                <div className="aspect-w-1 aspect-h-1">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-[15px]"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="text-[25px] text-[#003363] font-medium">
                    {product.title}
                  </h3>
                  <p className="text-[#e68b00] text-[25px]">
                    {product.subTitle}
                  </p>
                  <p className="text-[20px] text-[#00396e]/60 mt-2">
                    {product.status}
                  </p>
                  <button
                    className={`
                    mt-4 w-[143px] h-[45px] rounded-[50px] text-[20px]
                    ${
                      product.status === "Order Limit"
                        ? "bg-[#bfbfbf] text-white"
                        : "border-2 border-[#e68b00] text-[#e68b00] hover:bg-[#e68b00] hover:text-white"
                    }
                  `}
                  >
                    {product.action}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={prevPage}
              disabled={!hasPrevPage()}
              className={`w-[100px] h-[45px] rounded ${
                hasPrevPage()
                  ? "bg-[#f3f3f3] text-[#003363] hover:bg-gray-300"
                  : "bg-[#f3f3f3] text-gray-400 cursor-not-allowed"
              }`}
            >
              Back
            </button>
            <span className="flex items-center px-4 text-[#003363]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={!hasNextPage()}
              className={`w-[100px] h-[45px] rounded ${
                hasNextPage()
                  ? "bg-[#003363] text-white hover:bg-[#002a52]"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCategories;
