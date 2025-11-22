/**
 * useProductPagination Hook
 * 
 * Handles product pagination:
 * - Manages current page
 * - Calculates paginated items
 * - Provides navigation methods
 * 
 * Usage:
 * const { currentPage, totalPages, paginatedItems, goToPage, nextPage, prevPage } = useProductPagination(items, itemsPerPage);
 */

import { useState, useMemo } from 'react';

export const useProductPagination = (items = [], itemsPerPage = 6) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage);
  }, [items.length, itemsPerPage]);

  // Get paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  /**
   * Go to specific page
   * @param {number} pageNumber - Page number to go to
   */
  const goToPage = (pageNumber) => {
    const pageNum = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(pageNum);
  };

  /**
   * Go to next page
   */
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  /**
   * Go to previous page
   */
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  /**
   * Check if there's a next page
   * @returns {boolean}
   */
  const hasNextPage = () => {
    return currentPage < totalPages;
  };

  /**
   * Check if there's a previous page
   * @returns {boolean}
   */
  const hasPrevPage = () => {
    return currentPage > 1;
  };

  /**
   * Get page range for display (e.g., "1-6 of 20")
   * @returns {string}
   */
  const getPageRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, items.length);
    return `${startItem}-${endItem} of ${items.length}`;
  };

  /**
   * Reset to first page
   */
  const reset = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    getPageRange,
    reset,
  };
};

