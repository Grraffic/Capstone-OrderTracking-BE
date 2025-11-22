/**
 * useLoginForm Hook
 * 
 * Handles login form state and validation:
 * - Email and password input management
 * - Form validation
 * - Remember me functionality
 * - Form submission
 * 
 * Usage:
 * const { email, password, rememberMe, errors, handleChange, handleSubmit } = useLoginForm(onSubmit);
 */

import { useState, useCallback } from 'react';

export const useLoginForm = (onSubmit) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form data
   * @returns {Object} - Validation errors
   */
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    return newErrors;
  }, [formData]);

  /**
   * Handle input change
   * @param {Event} e - Input change event
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  }, [errors]);

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Validate form
      const newErrors = validateForm();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(formData);
        }
      } catch (error) {
        console.error('Form submission error:', error);
        setErrors({
          submit: error.message || 'An error occurred during login',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit]
  );

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData({
      email: '',
      password: '',
      rememberMe: false,
    });
    setErrors({});
  }, []);

  /**
   * Set form data (useful for pre-filling)
   * @param {Object} data - Form data to set
   */
  const setFormValues = useCallback((data) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  return {
    formData,
    email: formData.email,
    password: formData.password,
    rememberMe: formData.rememberMe,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFormValues,
  };
};

