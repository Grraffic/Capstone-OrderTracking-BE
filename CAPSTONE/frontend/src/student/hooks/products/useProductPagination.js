import { useState, useMemo, useEffect } from 'react';

/**
 * Custom hook to manage product pagination
 * @param {Array} items - Array of items to paginate
 * @param {number} itemsPerPage - Number of items per page (default: 8)
 * @returns {Object} - { currentPage, totalPages, paginatedItems, goToPage, nextPage, prevPage, canGoNext, canGoPrev }
 */
export const useProductPagination = (items, itemsPerPage = 8) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage) || 1;
  }, [items.length, itemsPerPage]);

  // Reset to page 1 when items change (e.g., after filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // Get paginated items for current page
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  // Navigation functions
  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev
  };
};

