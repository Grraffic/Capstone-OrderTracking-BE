import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce search input
 * @param {string} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {string} - Debounced value
 */
export const useSearchDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

