import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// authAPI not required here; token is stored and profile will be fetched by AuthContext on reload

function parseJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = JSON.parse(
      atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload;
  } catch (err) {
    return null;
  }
}

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    const email = params.get("email");

    if (error) {
      // Show a friendly error and redirect to login
      const message =
        error === "domain_not_allowed"
          ? `Your email ${
              typeof email === "object"
                ? email.email || email.value || JSON.stringify(email)
                : email || ""
            } is not allowed.\nStudents must use @student.laverdad.edu.ph and admins must use @laverdad.edu.ph.`
          : "Authentication error";
      // Use alert for now; app can replace with modal/toast
      window.alert(message);
      navigate("/login", { replace: true });
      return;
    }
    if (!token) {
      // Nothing to do
      navigate("/login", { replace: true });
      return;
    }

    // Store token and redirect based on role in JWT
    try {
      localStorage.setItem("authToken", token);
      const payload = parseJwt(token);
      const role = payload?.role;

      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "student") {
        navigate("/all-products", { replace: true });
      } else {
        // fallback
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("Auth callback handling error", error);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Processing authentication...</p>
    </div>
  );
};

export default AuthCallback;
