/**
 * useLogin Hook
 * 
 * Handles Google OAuth login logic including:
 * - Loading state management
 * - Error handling
 * - Login execution
 * 
 * Usage:
 * const { loading, error, handleGoogleLogin } = useLogin();
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const useLogin = () => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Starting Google login process...');
      await signInWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Failed to login with Google. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    loading,
    error,
    handleGoogleLogin,
    clearError,
  };
};

