/**
 * useLoginRedirect Hook
 *
 * Handles post-login redirect logic:
 * - Determines redirect route based on user role/email domain
 * - Handles redirect to previous page if available
 * - Manages redirect side effects
 *
 * Usage:
 * useLoginRedirect(user);
 */

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Determines the default route based on user email domain
 * @param {Object} user - User object with email property
 * @returns {string} - Route path
 */
const getDefaultRoute = (user) => {
  if (!user || !user.email) {
    return "/";
  }

  const email = user.email.toLowerCase();

  // Student domain
  if (email.endsWith("@student.laverdad.edu.ph")) {
    return "/all-products";
  }

  // Admin domain
  if (email.endsWith("@laverdad.edu.ph")) {
    return "/admin";
  }

  // Default fallback
  return "/";
};

export const useLoginRedirect = (user) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      // Get the page user was trying to access before login
      const from = location.state?.from?.pathname || getDefaultRoute(user);

      console.log(`Redirecting user to: ${from}`);
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  return { getDefaultRoute };
};
