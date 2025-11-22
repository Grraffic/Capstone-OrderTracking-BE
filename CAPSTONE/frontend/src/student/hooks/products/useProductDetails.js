import { useState, useCallback, useEffect } from "react";

/**
 * Custom hook for managing product details modal state and logic
 * 
 * Features:
 * - Modal open/close state
 * - Selected product management
 * - Size selection
 * - Quantity management
 * - Size confirmation
 * - Related products filtering
 */
export const useProductDetails = (allProducts = []) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sizeConfirmed, setSizeConfirmed] = useState(false);

  // Open modal with a specific product
  const openModal = useCallback((product) => {
    setSelectedProduct(product);
    setIsOpen(true);
    setSelectedSize("");
    setQuantity(1);
    setSizeConfirmed(false);
  }, []);

  // Close modal and reset state
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setSelectedProduct(null);
      setSelectedSize("");
      setQuantity(1);
      setSizeConfirmed(false);
    }, 300); // Delay reset to allow modal close animation
  }, []);

  // Handle size selection
  const handleSizeSelect = useCallback((size) => {
    setSelectedSize(size);
    setSizeConfirmed(false);
  }, []);

  // Handle size confirmation
  const handleSizeConfirm = useCallback(() => {
    if (selectedSize) {
      setSizeConfirmed(true);
    }
  }, [selectedSize]);

  // Handle quantity change
  const handleQuantityChange = useCallback((newQuantity) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  }, []);

  // Get related products (same education level or category)
  const getRelatedProducts = useCallback(() => {
    if (!selectedProduct || !allProducts.length) return [];

    return allProducts
      .filter((product) => {
        // Exclude current product
        if (product.id === selectedProduct.id) return false;

        // Filter by education level or category
        const sameEducationLevel =
          product.educationLevel === selectedProduct.educationLevel;
        const sameCategory = product.category === selectedProduct.category;

        return sameEducationLevel || sameCategory;
      })
      .slice(0, 8); // Limit to 8 related products
  }, [selectedProduct, allProducts]);

  // Switch to a different product (from carousel)
  const switchProduct = useCallback((product) => {
    setSelectedProduct(product);
    setSelectedSize("");
    setQuantity(1);
    setSizeConfirmed(false);
    // Scroll to top of modal
    const modalContent = document.querySelector('[data-modal-content]');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  }, []);

  // Get available sizes for the product
  const getAvailableSizes = useCallback(() => {
    if (!selectedProduct) return [];

    // If product has sizes array, use it
    if (selectedProduct.sizes && Array.isArray(selectedProduct.sizes)) {
      return selectedProduct.sizes;
    }

    // Default sizes based on item type
    const itemType = selectedProduct.itemType?.toLowerCase() || "";
    
    if (itemType.includes("uniform") || itemType.includes("shirt") || itemType.includes("blouse")) {
      return ["XS", "S", "M", "L", "XL", "XXL"];
    } else if (itemType.includes("pants") || itemType.includes("skirt")) {
      return ["XS", "S", "M", "L", "XL", "XXL"];
    } else {
      // For items without sizes (accessories, etc.)
      return ["N/A"];
    }
  }, [selectedProduct]);

  // Check if product requires size selection
  const requiresSizeSelection = useCallback(() => {
    const sizes = getAvailableSizes();
    return sizes.length > 0 && sizes[0] !== "N/A";
  }, [getAvailableSizes]);

  return {
    // State
    isOpen,
    selectedProduct,
    selectedSize,
    quantity,
    sizeConfirmed,

    // Actions
    openModal,
    closeModal,
    handleSizeSelect,
    handleSizeConfirm,
    handleQuantityChange,
    switchProduct,

    // Computed
    relatedProducts: getRelatedProducts(),
    availableSizes: getAvailableSizes(),
    requiresSizeSelection: requiresSizeSelection(),
  };
};

