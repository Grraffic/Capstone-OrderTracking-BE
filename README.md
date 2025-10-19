# miniCapstone Backend

Backend API for the Unified Ordering System - A Digital QR-Based School Uniform Inventory and Event Merchandise Management System for La Verdad Christian School and College, Apalit.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Student, admin, and staff user roles
- **Order Management**: Complete order lifecycle management
- **File Upload**: Image and document upload capabilities
- **Email Notifications**: Automated email notifications for orders and user actions
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error handling with detailed logging
- **Testing**: Unit and integration tests with Jest
- **Security**: Helmet, CORS, rate limiting, and input sanitization

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Database**: Supabase (Postgres) via @supabase/supabase-js (migrated from MongoDB)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **File Upload**: Multer
- **Email**: Nodemailer
- **Testing**: Jest with Supertest
- **Security**: Helmet, CORS, bcryptjs

## Project Structure

```
backend/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
├── validation/      # Input validation schemas
├── tests/           # Test files
├── uploads/         # File upload directory
├── server.js        # Application entry point
└── package.json     # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository and navigate to backend directory**

   ```bash
   cd miniCapstone/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:

   ```env
   PORT=5000
      NODE_ENV=development
      # Supabase configuration
      SUPABASE_URL=https://your-project.supabase.co
      SUPABASE_SERVICE_KEY=your-service-role-or-service-key
   JWT_SECRET=your-super-secret-jwt-key-here
   FRONTEND_URL=http://localhost:5173
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

   If you previously used MongoDB, remove `MONGODB_URI` and use the Supabase variables above. Create a `contacts` table in Supabase with at least the following columns:

   - id (uuid or bigint primary key)
   - name (text)
   - email (text)
   - subject (text)
   - message (text)
   - phone (text, nullable)
   - read (boolean, default false)
   - created_at (timestamp with time zone, default now())

   The backend uses the `contacts` table for contact form submissions.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000`

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/logout` - User logout (protected)

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Delete user (admin only)

### Health Check

- `GET /health` - Server health check
- `GET /` - API information

## Environment Variables

| Variable        | Description               | Default                                |
| --------------- | ------------------------- | -------------------------------------- |
| `PORT`          | Server port               | 5000                                   |
| `NODE_ENV`      | Environment mode          | development                            |
| `MONGODB_URI`   | MongoDB connection string | mongodb://localhost:27017/minicapstone |
| `JWT_SECRET`    | JWT signing secret        | -                                      |
| `JWT_EXPIRE`    | JWT expiration time       | 7d                                     |
| `FRONTEND_URL`  | Frontend application URL  | http://localhost:5173                  |
| `EMAIL_HOST`    | SMTP host                 | smtp.gmail.com                         |
| `EMAIL_PORT`    | SMTP port                 | 587                                    |
| `EMAIL_USER`    | SMTP username             | -                                      |
| `EMAIL_PASS`    | SMTP password             | -                                      |
| `MAX_FILE_SIZE` | Maximum file upload size  | 10485760 (10MB)                        |

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Security Features

- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse with request rate limiting
- **Input Validation**: Comprehensive request validation
- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Secure token-based authentication

## Error Handling

The application includes comprehensive error handling:

- **Global Error Handler**: Catches and formats all errors
- **Validation Errors**: Detailed validation error responses
- **404 Handler**: Custom not found responses
- **Async Error Wrapper**: Handles async/await errors

## Contributing

1. Follow the existing code structure and naming conventions
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is licensed under the MIT License.
