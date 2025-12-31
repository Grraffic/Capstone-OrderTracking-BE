# Backend Architecture Documentation

## Overview

This backend is built with **Node.js** and **Express.js**, using **Supabase** (PostgreSQL) as the database and **Socket.IO** for real-time updates. The architecture follows a **layered MVC pattern** with clear separation of concerns.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Passport.js with Google OAuth 2.0
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

## Architecture Pattern

The backend follows a **3-layer architecture**:

```
┌─────────────────────────────────────────┐
│         Routes Layer                    │
│  (HTTP Request/Response Handling)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Controllers Layer               │
│  (Business Logic Orchestration)         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Services Layer                  │
│  (Database Operations & Business Logic) │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Database (Supabase)            │
└─────────────────────────────────────────┘
```

## Directory Structure

```
backend/
├── server.js                 # Application entry point
├── package.json              # Dependencies and scripts
├── src/
│   ├── config/              # Configuration files
│   │   ├── admin.js         # Admin email configuration
│   │   ├── cloudinary.js    # Cloudinary setup
│   │   ├── database.js      # PostgreSQL connection
│   │   ├── passport.js      # Passport OAuth strategy
│   │   └── supabase.js      # Supabase client
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.js
│   │   ├── cart.controller.js
│   │   ├── contact.controller.js
│   │   ├── items.controller.js
│   │   ├── notification.controller.js
│   │   ├── order.controller.js
│   │   └── product.controller.js
│   ├── services/            # Business logic layer
│   │   ├── cart.service.js
│   │   ├── cloudinary.service.js
│   │   ├── inventory.service.js
│   │   ├── items.service.js
│   │   ├── notification.service.js
│   │   ├── order.service.js
│   │   └── product.service.js
│   ├── routes/              # API route definitions
│   │   ├── index.js         # Main router
│   │   ├── auth.js
│   │   ├── cart.js
│   │   ├── items.js
│   │   ├── notification.js
│   │   ├── orders.js
│   │   └── products.js
│   ├── middleware/          # Custom middleware
│   │   └── auth.js          # JWT verification
│   ├── models/              # Data models/schemas
│   │   └── contactFormSchema/
│   │       └── contactSchema.js
│   ├── utils/               # Utility functions
│   │   ├── avatarGenerator.js
│   │   └── qrCodeGenerator.js
│   └── db/                  # SQL schema files
│       ├── schema.sql
│       ├── users.sql
│       ├── items.sql
│       ├── inventory.sql
│       ├── cart.sql
│       └── products.sql
├── migrations/              # Database migrations
└── tests/                   # Test files
```

## Request Flow

### Standard Request Flow

```
1. HTTP Request
   ↓
2. Express Middleware (CORS, Compression, Helmet, Rate Limiting)
   ↓
3. Route Handler (routes/*.js)
   ↓
4. Authentication Middleware (if required)
   ↓
5. Controller (controllers/*.controller.js)
   ↓
6. Service Layer (services/*.service.js)
   ↓
7. Database (Supabase/PostgreSQL)
   ↓
8. Response (JSON)
```

### Example: Creating an Order

```
POST /api/orders
   ↓
routes/orders.js → orderController.createOrder
   ↓
controllers/order.controller.js → OrderService.createOrder
   ↓
services/order.service.js → Supabase insert
   ↓
Database (orders table)
   ↓
Socket.IO emit (real-time update)
   ↓
JSON Response
```

## Key Components

### 1. Server Entry Point (`server.js`)

- Initializes Express app
- Configures middleware (CORS, compression, helmet, rate limiting)
- Sets up Socket.IO for real-time updates
- Connects to database
- Registers routes
- Starts HTTP server

### 2. Configuration Layer (`src/config/`)

- **database.js**: PostgreSQL connection with retry logic
- **supabase.js**: Supabase client initialization
- **passport.js**: Google OAuth 2.0 authentication strategy
- **cloudinary.js**: Cloudinary image upload configuration
- **admin.js**: Admin email whitelist configuration

### 3. Routes Layer (`src/routes/`)

- Defines API endpoints
- Maps HTTP methods to controller methods
- Applies middleware (authentication, validation)
- Base path: `/api`

### 4. Controllers Layer (`src/controllers/`)

- Handles HTTP requests/responses
- Validates input
- Calls service methods
- Formats responses
- Handles errors

### 5. Services Layer (`src/services/`)

- Contains business logic
- Performs database operations
- Handles complex calculations
- Manages cross-service interactions
- Returns structured data

### 6. Middleware (`src/middleware/`)

- **auth.js**: JWT token verification
- Role-based access control (admin/student)

### 7. Utilities (`src/utils/`)

- **avatarGenerator.js**: Generates avatar URLs
- **qrCodeGenerator.js**: Generates QR code data for orders

## Database Schema

### Main Tables

- **users**: User accounts (students and admins)
- **items**: Inventory items (uniforms, merchandise)
- **orders**: Customer orders
- **cart_items**: Shopping cart items
- **notifications**: User notifications
- **contacts**: Contact form submissions

### Relationships

```
users (1) ──< (many) orders
users (1) ──< (many) cart_items
users (1) ──< (many) notifications
items (1) ──< (many) cart_items
items (1) ──< (many) orders (via JSONB items array)
```

## Authentication Flow

```
1. User clicks "Login with Google"
   ↓
2. GET /api/auth/google
   ↓
3. Passport redirects to Google OAuth
   ↓
4. User authenticates with Google
   ↓
5. Google redirects to /api/auth/google/callback
   ↓
6. Passport strategy validates email domain
   ↓
7. User created/updated in database
   ↓
8. JWT token generated
   ↓
9. Token returned to frontend
```

## Real-time Updates (Socket.IO)

Socket.IO is used for:
- Order status updates
- Inventory changes
- Notification delivery
- Real-time dashboard updates

Events:
- `order:created`
- `order:updated`
- `order:claimed`
- `item:updated`
- `items:restocked`
- `notification:new`

## Security Features

1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing control
3. **Rate Limiting**: Prevents brute force attacks
4. **JWT Authentication**: Stateless authentication
5. **Role-based Access**: Admin/Student separation
6. **Input Validation**: Request validation
7. **SQL Injection Protection**: Parameterized queries via Supabase

## Error Handling

- Controllers catch service errors
- Standardized error responses
- Error logging for debugging
- User-friendly error messages

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service key
- `JWT_SECRET`: JWT signing secret
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: OAuth callback URL
- `CLOUDINARY_URL`: Cloudinary configuration
- `FRONTEND_URL`: Frontend URL for CORS
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

## Performance Optimizations

1. **Compression**: Gzip compression for responses
2. **Query Batching**: Batched database queries
3. **Connection Pooling**: Database connection reuse
4. **Indexed Queries**: Optimized database queries
5. **Reduced Logging**: Minimal logging in production

## Testing

- Jest for unit tests
- Supertest for API testing
- HTTP test files in `tests/http/`

## Deployment

- Environment-specific configuration
- Database migrations
- Health checks
- Error monitoring

