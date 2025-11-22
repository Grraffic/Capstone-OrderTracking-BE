# Product Details Module

## Overview

The Product Details module provides a comprehensive modal interface for viewing detailed product information, selecting sizes, and managing orders. This module follows the **separation of concerns** principle with dedicated components for each functionality.

## 📁 Folder Structure

```
ProductDetails/
├── ProductDetailsModal.jsx    # Main modal container
├── ProductImageViewer.jsx     # Product image display with zoom
├── ProductInfo.jsx            # Product information section
├── SizeSelector.jsx           # Size selection component
├── ProductCarousel.jsx        # Related products carousel
├── index.js                   # Module exports
└── README.md                  # This file
```

## 🎯 Features

### 1. **Product Details Modal**
- Full-screen modal with split layout (image left, details right)
- Responsive design (stacks on mobile, side-by-side on desktop)
- Smooth animations and transitions
- Backdrop click to close

### 2. **Product Image Viewer**
- Large product image display
- Zoom in/out functionality
- Gradient background for visual appeal
- Status badges (Pre-Order, FREE, Extra Small)
- Fallback for missing images

### 3. **Product Information**
- Product name and education level
- Complete set badge
- Description
- Category information
- Stock status with color-coded badges
- Special notices (e.g., "For Senior High School Students Only")

### 4. **Size Selection**
- Interactive size buttons (XS, S, M, L, XL, XXL)
- Size measurements display (chest, length)
- Metric and imperial units
- Size confirmation checkbox
- Visual feedback for selected size

### 5. **Quantity Selector**
- Increment/decrement buttons
- Minimum quantity: 1
- Disabled state for out-of-stock items

### 6. **Action Buttons**
- **Add to Cart**: White button with blue outline
- **Order Now**: Orange button
- Both buttons disabled when:
  - Product is out of stock
  - Size not selected (for items requiring size)

### 7. **Related Products Carousel**
- Horizontal scrollable list
- Shows up to 8 related products
- Filters by education level or category
- Click to switch products without closing modal
- Scroll buttons for navigation
- Current product highlighted

## 🔧 Technical Implementation

### Components

#### **ProductDetailsModal.jsx**
Main container component that orchestrates all sub-components.

**Props:**
- `isOpen` (boolean): Modal visibility state
- `onClose` (function): Close modal handler
- `product` (object): Current product data
- `availableSizes` (array): Available sizes for the product
- `selectedSize` (string): Currently selected size
- `onSizeSelect` (function): Size selection handler
- `sizeConfirmed` (boolean): Size confirmation state
- `quantity` (number): Selected quantity
- `onQuantityChange` (function): Quantity change handler
- `relatedProducts` (array): Related products list
- `onProductSwitch` (function): Switch product handler
- `onAddToCart` (function): Add to cart handler
- `onOrderNow` (function): Order now handler
- `requiresSizeSelection` (boolean): Whether size selection is required

#### **ProductImageViewer.jsx**
Displays the product image with zoom functionality.

**Props:**
- `product` (object): Product data with image URL

**Features:**
- Click to zoom in/out
- Zoom button with icon
- Status badges overlay
- Error handling for missing images

#### **ProductInfo.jsx**
Displays product information and details.

**Props:**
- `product` (object): Product data

**Displays:**
- Education level badge
- Product name
- Complete set indicator
- Description
- Category
- Stock status
- Special notices
- FREE badge

#### **SizeSelector.jsx**
Handles size selection and displays measurements.

**Props:**
- `availableSizes` (array): Available sizes
- `selectedSize` (string): Currently selected size
- `onSizeSelect` (function): Size selection handler
- `sizeConfirmed` (boolean): Confirmation state

**Features:**
- Size buttons with visual feedback
- Size measurements (chest, length)
- Unit conversion (inches to cm)
- Confirmation checkbox

#### **ProductCarousel.jsx**
Displays related products in a scrollable carousel.

**Props:**
- `products` (array): Related products list
- `onProductClick` (function): Product click handler
- `currentProductId` (string): Current product ID

**Features:**
- Horizontal scroll
- Scroll buttons
- Current product highlighting
- Product cards with images and info

### Custom Hook

#### **useProductDetails.js**
Located in: `CAPSTONE/frontend/src/student/hooks/useProductDetails.js`

**Purpose:** Manages all product details modal state and logic.

**Returns:**
```javascript
{
  // State
  isOpen,
  selectedProduct,
  selectedSize,
  quantity,
  sizeConfirmed,

  // Actions
  openModal,
  closeModal,
  handleSizeSelect,
  handleSizeConfirm,
  handleQuantityChange,
  switchProduct,

  // Computed
  relatedProducts,
  availableSizes,
  requiresSizeSelection,
}
```

## 🚀 Usage

### Basic Implementation

```javascript
import { ProductDetailsModal } from "../components/ProductDetails";
import { useProductDetails } from "../hooks/useProductDetails";

function MyComponent() {
  const allProducts = [...]; // Your products array
  const productDetailsModal = useProductDetails(allProducts);

  const handleProductClick = (product) => {
    productDetailsModal.openModal(product);
  };

  const handleAddToCart = ({ product, size, quantity }) => {
    // Implement cart logic
    console.log("Add to cart:", { product, size, quantity });
  };

  const handleOrderNow = ({ product, size, quantity }) => {
    // Implement order logic
    console.log("Order now:", { product, size, quantity });
  };

  return (
    <>
      {/* Your product cards */}
      <ProductCard 
        product={product} 
        onProductClick={handleProductClick}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={productDetailsModal.isOpen}
        onClose={productDetailsModal.closeModal}
        product={productDetailsModal.selectedProduct}
        availableSizes={productDetailsModal.availableSizes}
        selectedSize={productDetailsModal.selectedSize}
        onSizeSelect={productDetailsModal.handleSizeSelect}
        sizeConfirmed={productDetailsModal.sizeConfirmed}
        quantity={productDetailsModal.quantity}
        onQuantityChange={productDetailsModal.handleQuantityChange}
        relatedProducts={productDetailsModal.relatedProducts}
        onProductSwitch={productDetailsModal.switchProduct}
        onAddToCart={handleAddToCart}
        onOrderNow={handleOrderNow}
        requiresSizeSelection={productDetailsModal.requiresSizeSelection}
      />
    </>
  );
}
```

## 🎨 Styling

All components use Tailwind CSS for styling with the following color scheme:
- **Primary Blue**: `#003363` (text, borders)
- **Primary Orange**: `#F28C28` (buttons, accents)
- **White**: Background and secondary buttons
- **Gray**: Text, borders, backgrounds

## 📱 Responsive Design

- **Mobile**: Stacked layout, full-width components
- **Tablet**: Optimized spacing and sizing
- **Desktop**: Split layout (image left, details right)
- **Large Desktop**: Maximum width constraint for readability

## ♿ Accessibility

- Keyboard navigation support
- ARIA labels on buttons
- Focus management
- Screen reader friendly
- High contrast colors

## 🔄 Future Enhancements

- [ ] Multiple image gallery
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Share product feature
- [ ] Size guide modal
- [ ] Color selection (if applicable)
- [ ] Stock notifications
- [ ] Recently viewed products

## 📝 Notes

- All items are FREE for students (no pricing displayed)
- Size selection is required for uniforms and clothing items
- Accessories and other items may not require size selection
- Related products are filtered by education level or category
- Maximum 8 related products shown in carousel

