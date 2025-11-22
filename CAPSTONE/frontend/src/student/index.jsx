// Student module entry exports
// Centralized export point for all student-facing components, pages, and hooks

// Pages
export { default as AllProducts } from "./pages/AllProducts";
export { default as ProductCategories } from "./pages/ProductCategories";
export { default as StudentDashboard } from "./pages/StudentDashboard";
export { default as ProductDetailsPage } from "./pages/ProductDetailsPage";
export { default as MyCart } from "./pages/MyCart";

// Components
export { default as Navbar } from "./components/Navbar";
export { default as HeroSection } from "./components/HeroSection";
export { default as CategorySidebar } from "./components/CategorySidebar";
export { default as ProductCard } from "./components/ProductCard";
export { default as ProductGrid } from "./components/ProductGrid";
export { default as TopPicks } from "./components/TopPicks";
export { default as Pagination } from "./components/Pagination";
export { default as Footer } from "./components/Footer";

// Hooks
export { useProducts } from "./hooks/useProducts";
export { useSearchDebounce } from "./hooks/useSearchDebounce";
export { useProductFilter } from "./hooks/useProductFilter";
export { useProductPagination } from "./hooks/useProductPagination";

// Constants
export * from "./constants/studentProducts";
