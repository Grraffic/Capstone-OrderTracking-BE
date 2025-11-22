import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollOnState() {
  const location = useLocation();

  useEffect(() => {
    if (location && location.state && location.state.scrollTo) {
      const id = location.state.scrollTo;
      const el = document.getElementById(id);
      if (el) {
        // Small timeout to allow mount
        setTimeout(
          () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
          50
        );
      }
    }
  }, [location]);
}
