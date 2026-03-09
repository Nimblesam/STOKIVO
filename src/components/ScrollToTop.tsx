import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll both window and any overflow container
    window.scrollTo(0, 0);
    document.getElementById("admin-main-scroll")?.scrollTo(0, 0);
    document.querySelector("main.flex-1")?.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
