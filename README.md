# Backend API Documentation

Backend API for miniCapstone - Unified Ordering System for School Uniform Inventory and Event Merchandise.

## 📚 Documentation

This backend includes comprehensive documentation in the `docs/` folder:

1. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Complete architecture overview, patterns, and design decisions
2. **[docs/FILE_CONNECTIONS.md](./docs/FILE_CONNECTIONS.md)** - Detailed file dependency graph and connections
3. **[docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - Complete API endpoint documentation
4. **[docs/OPTIMIZATION_SUMMARY.md](./docs/OPTIMIZATION_SUMMARY.md)** - Performance optimizations and improvements
5. **[docs/DEPENDENCY_GRAPH.txt](./docs/DEPENDENCY_GRAPH.txt)** - Text-based dependency visualization
6. **[docs/SUPABASE_TIMEOUT_FIX.md](./docs/SUPABASE_TIMEOUT_FIX.md)** - Database timeout troubleshooting guide

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.0.0
- PostgreSQL database (via Supabase)
- Environment variables configured

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Cloudinary
CLOUDINARY_URL=cloudinary://...

# Email (SMTP) – used for contact-form notifications to property custodians
# When a user submits the contact form, one email is sent BCC to all property custodians.
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ramosraf278@gmail.com
EMAIL_PASS=your-gmail-app-password
# Optional: from address for contact notifications (defaults to EMAIL_USER)
# CONTACT_FROM_EMAIL=noreply@example.com

# Property custodians who receive contact form emails (and have property_custodian access)
# Add ramosraf278@gmail.com and any other custodians; DB users with role property_custodian are included automatically.
SPECIAL_ADMIN_EMAILS=ramosraf278@gmail.com

# Application
FRONTEND_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
```

**Contact form email setup (optional):** To send contact form submissions to ramosraf278@gmail.com and other property custodians:

1. In your `.env`, set `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USER=ramosraf278@gmail.com`, and `EMAIL_PASS` to a [Gmail App Password](https://support.google.com/accounts/answer/185833) (not your normal password).
2. Set `SPECIAL_ADMIN_EMAILS=ramosraf278@gmail.com` (add more custodians comma-separated if needed). Users with role property_custodian in the database also receive the BCC automatically.
3. Restart the backend. When someone submits the contact form, one email is sent BCC to all property custodians (config + DB).

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `PORT`).

## 📁 Project Structure

```
backend/
├── server.js                 # Application entry point
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── services/            # Business logic layer
│   ├── routes/              # API route definitions
│   ├── middleware/          # Custom middleware
│   ├── models/              # Data models/schemas
│   ├── utils/               # Utility functions
│   └── db/                  # SQL schema files
├── migrations/              # Database migrations
└── tests/                   # Test files
```

## 🔌 API Endpoints

### Base URL

```
Development: http://localhost:5000/api
Production: [Your Production URL]/api
```

### Main Endpoints

- **Authentication**: `/api/auth/*`
- **Items**: `/api/items/*`
- **Orders**: `/api/orders/*`
- **Cart**: `/api/cart/*`
- **Notifications**: `/api/notifications/*`
- **Contact**: `/api/contact`

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete endpoint documentation.

## 🏗️ Architecture

The backend follows a **3-layer architecture**:

1. **Routes Layer** - HTTP request/response handling
2. **Controllers Layer** - Business logic orchestration
3. **Services Layer** - Database operations & business logic

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## 🔗 File Connections

All files are connected through a clear dependency chain:

- **Routes** → **Controllers** → **Services** → **Database**

See [FILE_CONNECTIONS.md](./FILE_CONNECTIONS.md) for the complete file dependency graph.

## 🔐 Authentication

The backend uses **Google OAuth 2.0** for authentication via Passport.js.

### Authentication Flow

1. User initiates login: `GET /api/auth/google`
2. Google OAuth consent screen
3. Callback: `GET /api/auth/google/callback`
4. JWT token generated and returned

### Protected Routes

Most routes require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## 🔄 Real-time Updates

The backend uses **Socket.IO** for real-time updates:

- Order status changes
- Inventory updates
- Notification delivery

Connect to the Socket.IO server at the same URL as the HTTP server.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📊 Performance

The backend has been optimized for performance:

- Query batching
- Connection pooling
- Response compression
- Rate limiting
- Reduced logging in production

See [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) for details.

## 🔒 Security

- Helmet security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Role-based access control
- Input validation
- SQL injection protection (via Supabase)

## 📝 Database

The backend uses **Supabase (PostgreSQL)** as the database.

### Main Tables

- `users` - User accounts
- `items` - Inventory items
- `orders` - Customer orders
- `cart_items` - Shopping cart items
- `notifications` - User notifications
- `contacts` - Contact form submissions

### Migrations

Database migrations are located in the `migrations/` directory.

## 🛠️ Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Code Style

- Follow existing code patterns
- Use async/await for asynchronous operations
- Handle errors appropriately
- Add comments for complex logic

## 📦 Dependencies

### Main Dependencies

- `express` - Web framework
- `@supabase/supabase-js` - Supabase client
- `passport` - Authentication
- `passport-google-oauth20` - Google OAuth strategy
- `socket.io` - Real-time communication
- `jsonwebtoken` - JWT tokens
- `cloudinary` - Image upload
- `helmet` - Security headers
- `cors` - CORS middleware
- `compression` - Response compression
- `express-rate-limit` - Rate limiting
- `morgan` - HTTP logging

See `package.json` for complete list.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Check `DATABASE_URL` in `.env`
   - Verify Supabase project is active
   - Check network connectivity

2. **Authentication Errors**

   - Verify Google OAuth credentials
   - Check callback URL matches Google Console
   - Ensure JWT_SECRET is set

3. **CORS Errors**
   - Verify `FRONTEND_URL` in `.env`
   - Check CORS configuration in `server.js`

## 📄 License

MIT

## 👥 Contributors

See project contributors.

## 📞 Support

For issues and questions, please refer to the documentation files or contact the development team.

---

**For detailed documentation, see:**

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture and design
- [docs/FILE_CONNECTIONS.md](./docs/FILE_CONNECTIONS.md) - File dependencies
- [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - API endpoints
- [docs/OPTIMIZATION_SUMMARY.md](./docs/OPTIMIZATION_SUMMARY.md) - Performance optimizations
- [docs/DEPENDENCY_GRAPH.txt](./docs/DEPENDENCY_GRAPH.txt) - Dependency graph
- [docs/SUPABASE_TIMEOUT_FIX.md](./docs/SUPABASE_TIMEOUT_FIX.md) - Troubleshooting guide
