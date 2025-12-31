# API Documentation

Complete API endpoint documentation for the backend.

## Base URL

```
Development: http://localhost:5000
Production: [Your Production URL]
```

All endpoints are prefixed with `/api`

---

## Authentication

### Google OAuth Login

**GET** `/api/auth/google`

Initiates Google OAuth flow.

**Response:** Redirects to Google OAuth consent screen

---

### OAuth Callback

**GET** `/api/auth/google/callback`

Handles Google OAuth callback.

**Query Parameters:**
- `code` - OAuth authorization code (from Google)

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student" | "admin"
  }
}
```

---

### Get User Profile

**GET** `/api/auth/profile`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "student" | "admin",
  "photoURL": "https://...",
  "courseYearLevel": "Grade 11" | null,
  "studentNumber": "2024-001" | null,
  "educationLevel": "Senior High" | null
}
```

---

### Upload Profile Image

**POST** `/api/auth/profile/upload-image`

Upload profile image to Cloudinary.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "image": "base64_encoded_image",
  "fileName": "profile.jpg"
}
```

**Response:**
```json
{
  "imageUrl": "https://cloudinary.com/..."
}
```

---

### Update Profile

**PUT** `/api/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "name": "New Name",
  "photoURL": "https://...",
  "courseYearLevel": "Grade 12",
  "studentNumber": "2024-001",
  "educationLevel": "Senior High"
}
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "New Name",
  "role": "student",
  "photoURL": "https://...",
  "courseYearLevel": "Grade 12",
  "studentNumber": "2024-001",
  "educationLevel": "Senior High"
}
```

---

### Logout

**POST** `/api/auth/logout`

Logout user (stateless - client should clear token).

**Response:**
```json
{
  "message": "Logged out"
}
```

---

## Items

### Get All Items

**GET** `/api/items`

Get all items with optional filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `educationLevel` (string) - Filter by education level
- `category` (string) - Filter by category
- `itemType` (string) - Filter by item type
- `status` (string) - Filter by status
- `search` (string) - Search by name, category, or description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_id",
      "name": "Polo Shirt",
      "education_level": "Senior High",
      "category": "Uniform",
      "item_type": "clothing",
      "stock": 50,
      "price": 500,
      "status": "Above Threshold",
      "image": "https://...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### Get Item by ID

**GET** `/api/items/:id`

Get single item by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Polo Shirt",
    "education_level": "Senior High",
    "category": "Uniform",
    "stock": 50,
    "price": 500,
    "status": "Above Threshold"
  }
}
```

---

### Get Item Statistics

**GET** `/api/items/stats`

Get items statistics by status category.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_items": 100,
    "above_threshold_items": 60,
    "at_reorder_point_items": 20,
    "critical_items": 15,
    "out_of_stock_items": 5,
    "total_value": 50000
  }
}
```

---

### Get Low Stock Items

**GET** `/api/items/low-stock`

Get items with Critical or At Reorder Point status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_id",
      "name": "Polo Shirt",
      "stock": 10,
      "status": "Critical"
    }
  ]
}
```

---

### Get Inventory Report

**GET** `/api/items/inventory-report`

Get full inventory report with beginning inventory, purchases, etc.

**Query Parameters:**
- `educationLevel` (string) - Filter by education level
- `search` (string) - Search by name, category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "report_id",
      "item_id": "item_id",
      "name": "Polo Shirt",
      "education_level": "Senior High",
      "size": "Medium",
      "stock": 50,
      "beginning_inventory": 100,
      "purchases": 20,
      "released": 70,
      "returns": 0,
      "unreleased": 0,
      "available": 50,
      "ending_inventory": 120,
      "unit_price": 500,
      "total_amount": 60000,
      "status": "Above Threshold"
    }
  ],
  "total": 50
}
```

---

### Get Available Sizes

**GET** `/api/items/sizes/:name/:educationLevel`

Get available sizes for a product by name and education level.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "size": "Small",
      "stock": 10,
      "status": "Critical",
      "id": "item_id",
      "price": 500,
      "available": true,
      "isPreOrder": false
    }
  ]
}
```

---

### Create Item

**POST** `/api/items`

Create new item (Admin only).

**Body:**
```json
{
  "name": "Polo Shirt",
  "education_level": "Senior High",
  "category": "Uniform",
  "item_type": "clothing",
  "stock": 50,
  "price": 500,
  "size": "Medium",
  "description": "School polo shirt",
  "image": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Polo Shirt",
    "stock": 50,
    "price": 500
  },
  "message": "Item created successfully"
}
```

---

### Update Item

**PUT** `/api/items/:id`

Update existing item (Admin only).

**Body:**
```json
{
  "name": "Updated Polo Shirt",
  "stock": 60,
  "price": 550
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "name": "Updated Polo Shirt",
    "stock": 60,
    "price": 550
  },
  "message": "Item updated successfully"
}
```

---

### Adjust Stock

**PATCH** `/api/items/:id/adjust`

Adjust item stock quantity (Admin only).

**Body:**
```json
{
  "adjustment": -10,
  "reason": "Damaged items"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "stock": 40
  },
  "message": "Stock adjusted successfully. Damaged items"
}
```

---

### Add Stock

**POST** `/api/items/:id/add-stock`

Add stock to item (goes to purchases) (Admin only).

**Body:**
```json
{
  "quantity": 20,
  "size": "Medium",
  "unitPrice": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_id",
    "stock": 60,
    "purchases": 20
  },
  "message": "Added 20 units to purchases. New total stock: 60. Beginning inventory unchanged."
}
```

---

### Delete Item

**DELETE** `/api/items/:id`

Delete item (soft delete) (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

---

## Orders

### Get All Orders

**GET** `/api/orders`

Get all orders with optional filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `status` (string) - Filter by status (pending, paid, claimed, cancelled)
- `order_type` (string) - Filter by order type (regular, pre-order)
- `education_level` (string) - Filter by education level
- `student_id` (string) - Filter by student ID
- `search` (string) - Search by order number, student name, or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_id",
      "order_number": "ORD-2024-001",
      "student_id": "user_id",
      "student_name": "John Doe",
      "student_email": "john@student.laverdad.edu.ph",
      "education_level": "Senior High",
      "items": [
        {
          "name": "Polo Shirt",
          "size": "Medium",
          "quantity": 2,
          "price": 500
        }
      ],
      "total_amount": 1000,
      "status": "pending",
      "order_type": "regular",
      "created_at": "2024-01-01T00:00:00Z",
      "student_data": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@student.laverdad.edu.ph",
        "photo_url": "https://..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### Get Order by ID

**GET** `/api/orders/:id`

Get single order by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "order_number": "ORD-2024-001",
    "student_id": "user_id",
    "items": [...],
    "total_amount": 1000,
    "status": "pending"
  }
}
```

---

### Get Order by Number

**GET** `/api/orders/number/:orderNumber`

Get order by order number.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "order_number": "ORD-2024-001",
    "status": "pending"
  }
}
```

---

### Create Order

**POST** `/api/orders`

Create new order.

**Body:**
```json
{
  "order_number": "ORD-2024-001",
  "student_id": "user_id",
  "student_name": "John Doe",
  "student_email": "john@student.laverdad.edu.ph",
  "education_level": "Senior High",
  "items": [
    {
      "name": "Polo Shirt",
      "size": "Medium",
      "quantity": 2,
      "price": 500
    }
  ],
  "total_amount": 1000,
  "order_type": "regular",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "order_number": "ORD-2024-001",
    "status": "pending"
  },
  "inventoryUpdates": [
    {
      "item": "Polo Shirt",
      "size": "Medium",
      "quantity": 2,
      "previousStock": 50,
      "newStock": 48,
      "success": true
    }
  ],
  "message": "Order created successfully and inventory updated"
}
```

---

### Update Order Status

**PATCH** `/api/orders/:id/status`

Update order status (Admin only).

**Body:**
```json
{
  "status": "paid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "status": "paid",
    "payment_date": "2024-01-01T00:00:00Z"
  },
  "message": "Order status updated successfully"
}
```

---

### Update Order

**PUT** `/api/orders/:id`

Update existing order.

**Body:**
```json
{
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id",
    "notes": "Updated notes"
  },
  "message": "Order updated successfully"
}
```

---

### Delete Order

**DELETE** `/api/orders/:id`

Delete order (soft delete) (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

---

### Get Order Statistics

**GET** `/api/orders/stats`

Get order statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_orders": 100,
    "pending_orders": 20,
    "paid_orders": 60,
    "claimed_orders": 15,
    "total_revenue": 50000
  }
}
```

---

## Cart

### Get Cart Items

**GET** `/api/cart/:userId`

Get all cart items for a user with inventory details.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cart_item_id",
      "user_id": "user_id",
      "inventory_id": "item_id",
      "size": "Medium",
      "quantity": 2,
      "inventory": {
        "id": "item_id",
        "name": "Polo Shirt",
        "price": 500,
        "stock": 50,
        "education_level": "Senior High"
      },
      "subtotal": 1000
    }
  ],
  "count": 1,
  "total": 1000
}
```

---

### Get Cart Count

**GET** `/api/cart/count/:userId`

Get cart item count for a user.

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

---

### Add to Cart

**POST** `/api/cart`

Add item to cart (or update quantity if exists).

**Body:**
```json
{
  "userId": "user_id",
  "inventoryId": "item_id",
  "size": "Medium",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_item_id",
    "user_id": "user_id",
    "inventory_id": "item_id",
    "quantity": 2
  },
  "message": "Item added to cart"
}
```

---

### Update Cart Item

**PUT** `/api/cart/:cartItemId`

Update cart item quantity.

**Body:**
```json
{
  "userId": "user_id",
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_item_id",
    "quantity": 3
  },
  "message": "Cart item updated"
}
```

---

### Remove from Cart

**DELETE** `/api/cart/:cartItemId`

Remove item from cart.

**Query Parameters:**
- `userId` (string) - User ID

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

### Clear Cart

**DELETE** `/api/cart/clear/:userId`

Clear entire cart for a user.

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

## Notifications

### Get Notifications

**GET** `/api/notifications`

Get all notifications for the authenticated user.

**Query Parameters:**
- `userId` (string) - User ID
- `unreadOnly` (boolean, default: false) - Get only unread notifications

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notification_id",
      "user_id": "user_id",
      "type": "restock",
      "title": "Item Restocked",
      "message": "Polo Shirt (Medium) is now available",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Get Unread Count

**GET** `/api/notifications/unread-count`

Get unread notification count for the authenticated user.

**Query Parameters:**
- `userId` (string) - User ID

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

---

### Mark All as Read

**PATCH** `/api/notifications/mark-all-read`

Mark all notifications as read for the authenticated user.

**Body:**
```json
{
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### Mark as Read

**PATCH** `/api/notifications/:id/read`

Mark a specific notification as read.

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Delete Notification

**DELETE** `/api/notifications/:id`

Delete a specific notification.

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## Contact

### Create Contact

**POST** `/api/contact`

Submit contact form.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Inquiry",
  "message": "Hello, I have a question..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "contact_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### Get Contacts

**GET** `/api/contact`

Get all contact submissions (Admin only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "contact_id",
      "name": "John Doe",
      "email": "john@example.com",
      "subject": "Inquiry",
      "message": "Hello..."
    }
  ]
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "message": "Error message here",
  "errorCode": "ERROR_CODE" // Optional
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `504` - Gateway Timeout (Database timeout)

---

## Real-time Events (Socket.IO)

The server emits the following Socket.IO events:

### Order Events
- `order:created` - New order created
- `order:updated` - Order updated
- `order:claimed` - Order claimed

### Item Events
- `item:updated` - Item inventory updated
- `items:restocked` - Item restocked (pre-order notification)

### Notification Events
- `notification:new` - New notification created

---

## Rate Limiting

- **Production**: 100 requests per 15 minutes per IP
- **Development**: 1000 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time

