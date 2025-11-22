import { useState, useMemo } from 'react';

/**
 * Custom hook to handle product filtering by category and search
 * @param {Array} products - Array of product objects
 * @param {string} searchQuery - Search query string (debounced)
 * @returns {Object} - { filteredProducts, selectedCategory, setSelectedCategory }
 */
export const useProductFilter = (products, searchQuery) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'school_uniform' || selectedCategory === 'pe_uniform') {
        filtered = filtered.filter(product => product.category === selectedCategory);
      } else if (selectedCategory === 'uniform') {
        filtered = filtered.filter(product => 
          product.category === 'school_uniform' || product.category === 'pe_uniform'
        );
      } else if (selectedCategory === 'other_items') {
        filtered = filtered.filter(product => product.category === 'other_items');
      }
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  return {
    filteredProducts,
    selectedCategory,
    setSelectedCategory
  };
};

