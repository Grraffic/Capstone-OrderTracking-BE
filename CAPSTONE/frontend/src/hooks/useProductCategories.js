/**
 * useProductCategories Hook
 * 
 * Manages product categories and filtering:
 * - Stores category data
 * - Handles category selection
 * - Filters products by category
 * 
 * Usage:
 * const { categories, selectedCategory, selectCategory, getFilteredProducts } = useProductCategories();
 */

import { useState } from 'react';

export const useProductCategories = () => {
  const [selectedCategory, setSelectedCategory] = useState('All Products');

  // Category data
  const categories = [
    {
      title: 'All Products',
      isActive: true,
    },
    {
      title: 'School Uniform',
      subCategories: ['Elementary', 'Senior High School', 'College'],
    },
    {
      title: 'PE Uniform',
      subCategories: ['Jersey', 'Jogging Pants', 'Full Set'],
    },
    {
      title: 'Other Items',
      subCategories: [],
    },
  ];

  // Product data
  const allProducts = [
    {
      id: 1,
      image: 'product1.jpg',
      title: 'Basic Education Uniform',
      subTitle: 'Elementary',
      category: 'School Uniform',
      status: 'Out of Stock',
      action: 'Pre-Order',
    },
    {
      id: 2,
      image: 'product2.jpg',
      title: 'Basic Education Uniform',
      subTitle: 'Senior Highschool',
      category: 'School Uniform',
      status: 'Order Limit',
      action: 'Order Limit',
    },
    {
      id: 3,
      image: 'product3.jpg',
      title: 'Basic Education Polo',
      subTitle: 'Elementary',
      category: 'School Uniform',
      status: 'Limited Stocks',
      action: 'Order Now',
    },
  ];

  /**
   * Select a category
   * @param {string} categoryTitle - Category title to select
   */
  const selectCategory = (categoryTitle) => {
    setSelectedCategory(categoryTitle);
  };

  /**
   * Get filtered products based on selected category
   * @returns {Array} - Filtered products
   */
  const getFilteredProducts = () => {
    if (selectedCategory === 'All Products') {
      return allProducts;
    }

    return allProducts.filter(
      (product) => product.category === selectedCategory
    );
  };

  /**
   * Get subcategories for selected category
   * @returns {Array} - Subcategories
   */
  const getSubcategories = () => {
    const category = categories.find(
      (cat) => cat.title === selectedCategory
    );
    return category?.subCategories || [];
  };

  /**
   * Check if category has subcategories
   * @param {string} categoryTitle - Category title
   * @returns {boolean}
   */
  const hasSubcategories = (categoryTitle) => {
    const category = categories.find((cat) => cat.title === categoryTitle);
    return category?.subCategories && category.subCategories.length > 0;
  };

  /**
   * Add a new product (for admin functionality)
   * @param {Object} product - Product object
   */
  const addProduct = (product) => {
    allProducts.push({
      ...product,
      id: allProducts.length + 1,
    });
  };

  return {
    categories,
    selectedCategory,
    selectCategory,
    getFilteredProducts,
    getSubcategories,
    hasSubcategories,
    addProduct,
    allProducts,
  };
};

