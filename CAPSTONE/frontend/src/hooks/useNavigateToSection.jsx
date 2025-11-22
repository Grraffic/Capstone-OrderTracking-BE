import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useNavigateToSection() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSection = useCallback(
    (id) => {
      if (location.pathname === "/" || location.pathname === "") {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      // Navigate to landing page and instruct it to scroll after mount
      navigate("/", { state: { scrollTo: id } });
    },
    [location, navigate]
  );

  return navigateToSection;
}
