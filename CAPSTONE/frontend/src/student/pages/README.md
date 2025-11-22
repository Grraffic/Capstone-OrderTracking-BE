# Student Pages

This directory contains all student-facing pages for the La Verdad OrderFlow system.

## Pages

### AllProducts.jsx

The main product browsing page for students with the following features:

**Layout:**

- Top navigation bar with search and user profile
- Hero section with campus image
- Three-column layout: category sidebar, product grid, and top picks
- Responsive design (collapses to single column on mobile)
- Footer with contact information

**Features:**

- Product filtering by category (All Products, Uniform, PE Uniform, Other Items)
- Search functionality with debounce (300ms)
- Pagination (8 items per page)
- Product cards with status badges (In Stock, Out of Stock, Pre-Order, Limited Stocks)
- Top picks recommendations
- Order and pre-order functionality (placeholder)

**Route:** `/all-products` (Protected - Student role only)

## Architecture

All pages follow the separation of concerns pattern:

- **Components**: Pure presentational (UI/JSX/styling only)
- **Hooks**: Business logic (state management, API calls, filtering, pagination)
- **Constants**: Mock data and configuration

## Related Files

**Components:** `frontend/src/student/components/`

- Navbar.jsx
- HeroSection.jsx
- CategorySidebar.jsx
- ProductCard.jsx
- ProductGrid.jsx
- TopPicks.jsx
- Pagination.jsx
- Footer.jsx

**Hooks:** `frontend/src/student/hooks/`

- useProducts.js - Fetch and manage product data
- useProductFilter.js - Handle category filtering and search
- useProductPagination.js - Manage pagination logic
- useSearchDebounce.js - Debounce search input

**Constants:** `frontend/src/student/constants/`

- studentProducts.js - Mock product data and categories
