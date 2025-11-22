# Student Components

This directory contains all reusable UI components for the student-facing interface.

## Component Overview

All components follow the **separation of concerns** principle:

- Components contain **only UI/JSX/styling**
- Business logic is extracted into custom hooks
- Components receive data and callbacks via props

## Components

### Navbar.jsx

Top navigation bar with user profile and actions.

**Props:**

- None (uses AuthContext for user data)

**Features:**

- Logo and branding
- Notification icon with rounded background
- Shopping cart icon with rounded background
- User profile section with:
  - User avatar (first letter of name)
  - User name display
  - "Student" role badge (auto-displayed for @student.laverdad.edu.ph emails)
  - Dropdown arrow with rotation animation
  - Dropdown menu with:
    - User info (name and email)
    - My Profile
    - My Orders
    - Settings
    - Logout
- Click-outside detection to close dropdown
- Responsive mobile menu with all features
- Fully responsive across mobile, tablet, and desktop

---

### HeroSection.jsx

Hero banner with campus image and overlay text.

**Props:** None (self-contained)

**Features:**

- Background image with gradient overlay
- "Order Yours" heading
- Responsive sizing
- Fallback gradient if image fails to load

---

### CategorySidebar.jsx

Sidebar for filtering products by category.

**Props:**

- `selectedCategory` (string) - Currently selected category
- `onCategoryChange` (function) - Callback when category changes

**Features:**

- Expandable/collapsible subcategories
- Active state highlighting (blue)
- Sticky positioning on desktop
- Categories: All Products, Uniform (School/PE), Other Items

---

### ProductCard.jsx

Individual product card with image, info, and action button.

**Props:**

- `product` (object) - Product data
- `onOrderClick` (function) - Callback for "Order Now"
- `onPreOrderClick` (function) - Callback for "Pre-Order"

**Features:**

- Product image with fallback
- Status badge (In Stock, Out of Stock, Pre-Order, Limited Stocks)
- Product name and description
- Price display
- Action button (Order Now / Pre-Order / Out of Stock)
- Hover effects (shadow, scale)

---

### ProductGrid.jsx

Grid layout for displaying multiple product cards.

**Props:**

- `products` (array) - Array of product objects
- `onOrderClick` (function) - Callback for order action
- `onPreOrderClick` (function) - Callback for pre-order action

**Features:**

- Responsive grid (4 cols desktop, 2 cols tablet, 1 col mobile)
- Empty state when no products found
- Consistent spacing and layout

---

### TopPicks.jsx

Sidebar showing recommended/featured products.

**Props:**

- `products` (array) - Array of top pick products
- `onProductClick` (function) - Callback when product is clicked

**Features:**

- Compact card layout
- Star icon indicator
- Sticky positioning on desktop
- Moves below grid on mobile

---

### Pagination.jsx

Pagination controls for navigating through product pages.

**Props:**

- `currentPage` (number) - Current page number
- `totalPages` (number) - Total number of pages
- `onPageChange` (function) - Callback to change page
- `onPrevious` (function) - Callback for previous button
- `onNext` (function) - Callback for next button
- `canGoPrev` (boolean) - Whether previous is enabled
- `canGoNext` (boolean) - Whether next is enabled

**Features:**

- Previous/Next buttons
- Page number indicators
- Ellipsis for large page counts
- Disabled state styling
- Blue accent color

---

### Footer.jsx

Site footer with contact info and links.

**Props:** None (self-contained)

**Features:**

- La Verdad logo and branding
- Contact information (phone, email, address)
- Quick links
- Social media icons
- Copyright notice
- Responsive grid layout

---

## Styling

All components use **Tailwind CSS** with the following conventions:

**Colors:**

- Primary CTA: Orange (#F97316)
- Accent/Active: Blue (#3B82F6)
- Text: Gray scale
- Backgrounds: White, Gray-50, Gray-900

**Responsive Breakpoints:**

- `sm:` - 640px (mobile)
- `md:` - 768px (tablet)
- `lg:` - 1024px (desktop)
- `xl:` - 1280px (large desktop)

**Common Patterns:**

- Rounded corners: `rounded-lg`, `rounded-full`
- Shadows: `shadow-md`, `shadow-lg`, `shadow-xl`
- Hover effects: `hover:shadow-xl`, `hover:scale-105`
- Transitions: `transition-all duration-300`

---

## Usage Example

```jsx
import Navbar from '../components/Navbar';
import ProductGrid from '../components/ProductGrid';

function MyPage() {
  const products = [...]; // from hook

  return (
    <>
      {/* Navbar automatically gets user data from AuthContext */}
      <Navbar />

      <ProductGrid
        products={products}
        onOrderClick={(product) => console.log('Order:', product)}
        onPreOrderClick={(product) => console.log('Pre-order:', product)}
      />
    </>
  );
}
```

---

## Related Files

**Hooks:** `frontend/src/student/hooks/`
**Constants:** `frontend/src/student/constants/studentProducts.js`
**Pages:** `frontend/src/student/pages/AllProducts.jsx`
