require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./src/routes");
const passport = require("passport");
// const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// ============================================================================
// SOCKET.IO CONFIGURATION
// ============================================================================

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set("io", io);

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API (can be configured if needed)
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware - compress responses
app.use(compression());

// Request logging - only in development or with specific format
if (!isProduction) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting - protect against brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use("/api", limiter);

// CORS Configuration - Allow requests from frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body Parser Configuration - Increase limit for base64 image uploads
// Default limit is 100kb, but we need to support up to 10MB for images
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request interceptor for eligibility bulk update debugging
app.use('/api/system-admin/eligibility/bulk', (req, res, next) => {
  if (req.method === 'PUT') {
    console.log('\n=== BULK UPDATE REQUEST INTERCEPTED ===');
    console.log('Raw body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Method:', req.method);
    console.log('URL:', req.url);
  }
  next();
});

// Passport initialization
app.use(passport.initialize());

//API ROUTES
app.use("/api", routes);

const { connectDB } = require("./src/config/database");

// Start server after DB check
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO enabled for real-time updates`);
    });
  })
  .catch((err) => {
    console.error(
      "Failed to initialize DB, server not started:",
      err.message || err
    );
    process.exit(1);
  });
