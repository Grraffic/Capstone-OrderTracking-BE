import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // User roles for school uniform ordering system
  // - STUDENT: Students ordering uniforms (@student.laverdad.edu.ph)
  // - ADMIN: Administrators managing uniform orders (@laverdad.edu.ph)
  const USER_ROLES = {
    STUDENT: "student",
    ADMIN: "admin",
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedToken = localStorage.getItem("authToken");
        if (storedToken) {
          const response = await authAPI.getProfile();
          const userData = response.data;
          // Normalize profile shape for frontend components
          // Extract email safely - handle both string and object cases
          let emailString = "";
          if (typeof userData.email === "string") {
            emailString = userData.email;
          } else if (userData.email && typeof userData.email === "object") {
            // Try common object property names
            emailString = userData.email.email || userData.email.value || "";
          }

          const normalized = {
            id: userData.id,
            email: emailString,
            role: userData.role,
            displayName:
              userData.name || (emailString ? emailString.split("@")[0] : ""),
            photoURL: userData.photoURL || null,
          };

          setUser(normalized);
          const role = userData.role || determineUserRole(userData);
          setUserRole(role);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // If token is invalid, clear it
        localStorage.removeItem("authToken");
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const determineUserRole = (userData) => {
    // Extract email safely - handle both string and object cases
    let emailString = "";
    if (typeof userData.email === "string") {
      emailString = userData.email;
    } else if (userData.email && typeof userData.email === "object") {
      emailString = userData.email.email || userData.email.value || "";
    }

    const email = (emailString || "").toLowerCase();

    // Enforce domain-based roles per project rules
    if (email.endsWith("@student.laverdad.edu.ph")) {
      return USER_ROLES.STUDENT;
    }

    // Exact admin domain (no student subdomain)
    if (
      email.endsWith("@laverdad.edu.ph") &&
      !email.endsWith("@student.laverdad.edu.ph")
    ) {
      return USER_ROLES.ADMIN;
    }

    return USER_ROLES.STUDENT; // default to student when in doubt
  };

  const signInWithGoogle = async () => {
    try {
      // Redirect to backend Google OAuth endpoint using environment variable
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      window.location.href = `${baseUrl}/auth/google`;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem("authToken");
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const updateUser = (updatedUserData) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...updatedUserData,
    }));
  };

  const hasRole = (role) => {
    return userRole === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(userRole);
  };

  const value = {
    user,
    userRole,
    loading,
    USER_ROLES,
    signInWithGoogle,
    logout,
    updateUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
