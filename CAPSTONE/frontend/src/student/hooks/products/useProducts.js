import { useState, useEffect } from "react";
import { MOCK_PRODUCTS } from "../../constants/studentProducts";

/**
 * Custom hook to fetch and manage product data
 * @returns {Object} - { products, loading, error, refetch }
 */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In production, replace with actual API call:
      // const response = await fetch('/api/products');
      // const data = await response.json();
      // setProducts(data);

      setProducts(MOCK_PRODUCTS);
    } catch (err) {
      setError(err.message || "Failed to fetch products");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
};
