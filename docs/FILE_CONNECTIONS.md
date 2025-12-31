# Backend File Connections & Dependencies

This document maps all file connections and dependencies in the backend.

## File Dependency Graph

```
server.js
├── src/routes/index.js
│   ├── src/routes/auth.js
│   │   ├── src/config/passport.js
│   │   ├── src/controllers/auth.controller.js
│   │   ├── src/middleware/auth.js
│   │   ├── src/config/supabase.js
│   │   ├── src/services/cloudinary.service.js
│   │   └── src/utils/avatarGenerator.js
│   ├── src/routes/items.js
│   │   └── src/controllers/items.controller.js
│   │       ├── src/services/items.service.js
│   │       ├── src/services/notification.service.js
│   │       └── src/services/cloudinary.service.js
│   ├── src/routes/orders.js
│   │   └── src/controllers/order.controller.js
│   │       └── src/services/order.service.js
│   │           ├── src/config/supabase.js
│   │           └── src/utils/qrCodeGenerator.js
│   ├── src/routes/cart.js
│   │   └── src/controllers/cart.controller.js
│   │       └── src/services/cart.service.js
│   ├── src/routes/notification.js
│   │   └── src/controllers/notification.controller.js
│   │       └── src/services/notification.service.js
│   └── src/controllers/contact.controller.js
├── src/config/database.js
└── Socket.IO (io instance)
```

## Detailed File Connections

### 1. Entry Point: `server.js`

**Dependencies:**
- `express` - Web framework
- `http` - HTTP server
- `socket.io` - Real-time communication
- `cors` - Cross-origin resource sharing
- `compression` - Response compression
- `helmet` - Security headers
- `morgan` - HTTP logging
- `express-rate-limit` - Rate limiting
- `passport` - Authentication
- `dotenv` - Environment variables
- `./src/routes` - Route definitions
- `./src/config/database` - Database connection

**Exports:**
- Express app instance
- HTTP server instance
- Socket.IO instance (via `app.set('io', io)`)

**Connections:**
```
server.js
  → src/routes/index.js (main router)
  → src/config/database.js (DB connection)
  → Socket.IO (real-time updates)
```

---

### 2. Main Router: `src/routes/index.js`

**Dependencies:**
- `express.Router`
- `./auth` - Authentication routes
- `./items` - Items routes
- `./orders` - Orders routes
- `./cart` - Cart routes
- `./notification` - Notification routes
- `../controllers/contact.controller` - Contact controller

**Connections:**
```
routes/index.js
  → routes/auth.js
  → routes/items.js
  → routes/orders.js
  → routes/cart.js
  → routes/notification.js
  → controllers/contact.controller.js
```

---

### 3. Authentication Routes: `src/routes/auth.js`

**Dependencies:**
- `express.Router`
- `../config/passport` - Passport OAuth strategy
- `../controllers/auth.controller` - Auth controller
- `../middleware/auth` - JWT verification
- `../config/supabase` - Database client
- `../services/cloudinary.service` - Image upload
- `../utils/avatarGenerator` - Avatar generation

**Endpoints:**
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/profile/upload-image` - Upload profile image
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/profile/refresh-picture` - Refresh profile picture
- `POST /api/auth/logout` - Logout

**Connections:**
```
routes/auth.js
  → config/passport.js
  → controllers/auth.controller.js
  → middleware/auth.js
  → config/supabase.js
  → services/cloudinary.service.js
  → utils/avatarGenerator.js
```

---

### 4. Items Routes: `src/routes/items.js`

**Dependencies:**
- `express.Router`
- `../controllers/items.controller` - Items controller

**Endpoints:**
- `GET /api/items` - Get all items
- `GET /api/items/stats` - Get statistics
- `GET /api/items/low-stock` - Get low stock items
- `GET /api/items/inventory-report` - Get inventory report
- `GET /api/items/sizes/:name/:educationLevel` - Get available sizes
- `GET /api/items/:id` - Get item by ID
- `GET /api/items/:id/pre-order-count` - Get pre-order count
- `POST /api/items` - Create item
- `POST /api/items/upload-image` - Upload item image
- `PUT /api/items/:id` - Update item
- `PATCH /api/items/:id/adjust` - Adjust stock
- `POST /api/items/:id/add-stock` - Add stock
- `POST /api/items/:id/reset-beginning-inventory` - Reset beginning inventory
- `DELETE /api/items/:id` - Delete item

**Connections:**
```
routes/items.js
  → controllers/items.controller.js
    → services/items.service.js
      → services/inventory.service.js
      → services/notification.service.js
      → config/supabase.js
    → services/cloudinary.service.js
```

---

### 5. Orders Routes: `src/routes/orders.js`

**Dependencies:**
- `express.Router`
- `../controllers/order.controller` - Order controller

**Endpoints:**
- `GET /api/orders` - Get all orders
- `GET /api/orders/stats` - Get statistics
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/number/:orderNumber` - Get order by number
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

**Connections:**
```
routes/orders.js
  → controllers/order.controller.js
    → services/order.service.js
      → config/supabase.js
      → utils/qrCodeGenerator.js
      → services/inventory.service.js (indirect via items.service)
```

---

### 6. Cart Routes: `src/routes/cart.js`

**Dependencies:**
- `express.Router`
- `../controllers/cart.controller` - Cart controller

**Endpoints:**
- `GET /api/cart/:userId` - Get cart items
- `GET /api/cart/count/:userId` - Get cart count
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:cartItemId` - Update cart item
- `DELETE /api/cart/:cartItemId` - Remove from cart
- `DELETE /api/cart/clear/:userId` - Clear cart

**Connections:**
```
routes/cart.js
  → controllers/cart.controller.js
    → services/cart.service.js
      → config/supabase.js
```

---

### 7. Notification Routes: `src/routes/notification.js`

**Dependencies:**
- `express.Router`
- `../controllers/notification.controller` - Notification controller

**Endpoints:**
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

**Connections:**
```
routes/notification.js
  → controllers/notification.controller.js
    → services/notification.service.js
      → config/supabase.js
```

---

## Service Layer Dependencies

### `src/services/items.service.js`

**Dependencies:**
- `../config/supabase` - Database client
- `./notification.service` - Notification service
- `./order.service` - Order service (for pre-order conversion)
- `./inventory.service` - Inventory service

**Used By:**
- `controllers/items.controller.js`

**Connections:**
```
items.service.js
  → config/supabase.js
  → services/notification.service.js
  → services/order.service.js
  → services/inventory.service.js
```

---

### `src/services/order.service.js`

**Dependencies:**
- `../config/supabase` - Database client
- `../utils/qrCodeGenerator` - QR code generation

**Used By:**
- `controllers/order.controller.js`
- `services/items.service.js` (for pre-order conversion)

**Connections:**
```
order.service.js
  → config/supabase.js
  → utils/qrCodeGenerator.js
```

---

### `src/services/inventory.service.js`

**Dependencies:**
- `../config/supabase` - Database client

**Used By:**
- `services/items.service.js`
- `controllers/items.controller.js`

**Connections:**
```
inventory.service.js
  → config/supabase.js
```

---

### `src/services/notification.service.js`

**Dependencies:**
- `../config/supabase` - Database client

**Used By:**
- `services/items.service.js`
- `controllers/notification.controller.js`
- `controllers/items.controller.js`

**Connections:**
```
notification.service.js
  → config/supabase.js
```

---

### `src/services/cart.service.js`

**Dependencies:**
- `../config/supabase` - Database client

**Used By:**
- `controllers/cart.controller.js`

**Connections:**
```
cart.service.js
  → config/supabase.js
```

---

### `src/services/cloudinary.service.js`

**Dependencies:**
- `../config/cloudinary` - Cloudinary configuration
- `cloudinary` package

**Used By:**
- `controllers/auth.controller.js`
- `controllers/items.controller.js`

**Connections:**
```
cloudinary.service.js
  → config/cloudinary.js
```

---

## Configuration Files

### `src/config/database.js`

**Dependencies:**
- `postgres` package
- `dotenv` - Environment variables

**Used By:**
- `server.js`

**Exports:**
- `connectDB()` - Database connection function
- `sql` - Database client instance

---

### `src/config/supabase.js`

**Dependencies:**
- `@supabase/supabase-js` package
- `dotenv` - Environment variables

**Used By:**
- All services
- All controllers
- `config/passport.js`

**Exports:**
- `supabase` - Supabase client instance

---

### `src/config/passport.js`

**Dependencies:**
- `passport` package
- `passport-google-oauth20` package
- `./supabase` - Database client
- `./admin` - Admin configuration
- `../utils/avatarGenerator` - Avatar generation

**Used By:**
- `routes/auth.js`

**Exports:**
- `passport` - Configured Passport instance

---

### `src/config/cloudinary.js`

**Dependencies:**
- `cloudinary` package
- `dotenv` - Environment variables

**Used By:**
- `services/cloudinary.service.js`

**Exports:**
- Cloudinary configuration

---

### `src/config/admin.js`

**Dependencies:**
- None (configuration file)

**Used By:**
- `config/passport.js`

**Exports:**
- `isSpecialAdmin()` - Check if email is special admin
- `getSpecialAdminEmails()` - Get admin emails list

---

## Middleware

### `src/middleware/auth.js`

**Dependencies:**
- `jsonwebtoken` package
- `dotenv` - Environment variables

**Used By:**
- `routes/auth.js`
- All protected routes

**Exports:**
- `verifyToken` - JWT verification middleware
- `requireRole` - Role-based access middleware
- `requireAdmin` - Admin-only middleware
- `requireStudent` - Student-only middleware

---

## Utilities

### `src/utils/avatarGenerator.js`

**Dependencies:**
- None (pure functions)

**Used By:**
- `config/passport.js`
- `routes/auth.js`

**Exports:**
- `getProfilePictureUrl()` - Get profile picture URL
- `generateInitialsAvatar()` - Generate initials avatar

---

### `src/utils/qrCodeGenerator.js`

**Dependencies:**
- None (pure functions)

**Used By:**
- `services/order.service.js`

**Exports:**
- `generateOrderReceiptQRData()` - Generate QR code data

---

## Models

### `src/models/contactFormSchema/contactSchema.js`

**Dependencies:**
- Validation library (if any)

**Used By:**
- `controllers/contact.controller.js`

---

## Circular Dependencies

**Note:** There is a circular dependency between:
- `services/items.service.js` ↔ `services/order.service.js`

This is handled by requiring `OrderService` inside the method that needs it, rather than at the top level.

---

## Data Flow Examples

### Example 1: Creating an Order

```
1. POST /api/orders
   ↓
2. routes/orders.js → orderController.createOrder()
   ↓
3. controllers/order.controller.js → OrderService.createOrder()
   ↓
4. services/order.service.js
   ├── Generate QR code (utils/qrCodeGenerator.js)
   ├── Insert order (config/supabase.js)
   └── Update inventory (config/supabase.js)
   ↓
5. Socket.IO emit (server.js → io instance)
   ↓
6. Response to client
```

### Example 2: Restocking an Item

```
1. PUT /api/items/:id
   ↓
2. routes/items.js → itemsController.updateItem()
   ↓
3. controllers/items.controller.js → ItemsService.updateItem()
   ↓
4. services/items.service.js
   ├── Update item (config/supabase.js)
   └── Handle restock notifications
       ↓
5. services/notification.service.js
   ├── Find pre-orders (config/supabase.js)
   └── Create notifications (config/supabase.js)
       ↓
6. services/order.service.js
   └── Convert pre-orders to regular (config/supabase.js)
       ↓
7. Socket.IO emit notifications
   ↓
8. Response to client
```

### Example 3: Google OAuth Login

```
1. GET /api/auth/google
   ↓
2. routes/auth.js → passport.authenticate('google')
   ↓
3. config/passport.js → GoogleStrategy
   ├── Validate email domain (config/admin.js)
   ├── Upsert user (config/supabase.js)
   └── Generate avatar (utils/avatarGenerator.js)
   ↓
4. controllers/auth.controller.js → oauthCallback()
   ├── Generate JWT (jsonwebtoken)
   └── Return token
   ↓
5. Response to client
```

---

## Summary

- **Total Files**: ~50+ files
- **Main Entry Point**: `server.js`
- **Route Files**: 6 route files
- **Controller Files**: 7 controller files
- **Service Files**: 7 service files
- **Config Files**: 5 config files
- **Middleware Files**: 1 middleware file
- **Utility Files**: 2 utility files

All files are connected through a clear dependency chain, with services handling business logic and controllers handling HTTP concerns.

