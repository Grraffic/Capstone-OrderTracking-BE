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

// Trust proxy so req.ip is the client IP behind Render's reverse proxy
app.set("trust proxy", 1);

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// Server-level security: Set connection limits to prevent resource exhaustion
server.maxConnections = parseInt(process.env.MAX_CONNECTIONS, 10) || 1000;
server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT_MS, 10) || 65000; // 65 seconds
server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT_MS, 10) || 66000; // 66 seconds (must be > keepAliveTimeout)

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
// AUTO-VOID UNCLAIMED ORDERS (cron: daily / every minute / or every N seconds for testing)
// ============================================================================
const cron = require("node-cron");
const OrderService = require("./src/services/property_custodian/order.service");
const voidUnclaimedAfterSeconds = process.env.VOID_UNCLAIMED_AFTER_SECONDS != null
  ? parseInt(process.env.VOID_UNCLAIMED_AFTER_SECONDS, 10)
  : null;
const voidUnclaimedAfterMinutes = process.env.VOID_UNCLAIMED_AFTER_MINUTES != null
  ? parseInt(process.env.VOID_UNCLAIMED_AFTER_MINUTES, 10)
  : null;
const voidUnclaimedDays = parseInt(process.env.VOID_UNCLAIMED_AFTER_DAYS, 10) || 7;
const voidUnclaimedCron = process.env.VOID_UNCLAIMED_CRON || (voidUnclaimedAfterMinutes != null ? "* * * * *" : "0 2 * * *");

// 10-second claim window for testing: run every 10 seconds and void unconfirmed orders older than 10 sec
if (voidUnclaimedAfterSeconds != null && voidUnclaimedAfterSeconds > 0) {
  const runVoid = async () => {
    try {
      const result = await OrderService.voidUnclaimedOrdersOlderThanSeconds(voidUnclaimedAfterSeconds);
      if (result.voidedCount > 0) {
        console.log(`Auto-void job: voided ${result.voidedCount} order(s) (older than ${voidUnclaimedAfterSeconds} second(s))`);
      }
    } catch (err) {
      console.error("Auto-void job error:", err);
    }
  };
  setInterval(runVoid, voidUnclaimedAfterSeconds * 1000);
  runVoid(); // run once on startup
  console.log(`Auto-void job scheduled (TEST): unclaimed orders older than ${voidUnclaimedAfterSeconds} second(s) (interval: every ${voidUnclaimedAfterSeconds}s)`);
} else if (voidUnclaimedCron) {
  cron.schedule(voidUnclaimedCron, async () => {
    try {
      if (voidUnclaimedAfterMinutes != null && voidUnclaimedAfterMinutes > 0) {
        const result = await OrderService.voidUnclaimedOrdersOlderThanMinutes(voidUnclaimedAfterMinutes);
        if (result.voidedCount > 0) {
          console.log(`Auto-void job: voided ${result.voidedCount} order(s) (older than ${voidUnclaimedAfterMinutes} minute(s))`);
        }
      } else {
        const result = await OrderService.voidUnclaimedOrdersOlderThanDays(voidUnclaimedDays);
        if (result.voidedCount > 0) {
          console.log(`Auto-void job: voided ${result.voidedCount} order(s) (older than ${voidUnclaimedDays} days)`);
        }
      }
    } catch (err) {
      console.error("Auto-void job error:", err);
    }
  });
  if (voidUnclaimedAfterMinutes != null) {
    console.log(`Auto-void job scheduled (TEST): unclaimed orders older than ${voidUnclaimedAfterMinutes} minute(s) (cron: every minute)`);
  } else {
    console.log(`Auto-void job scheduled: unclaimed orders older than ${voidUnclaimedDays} days (cron: ${voidUnclaimedCron})`);
  }
}

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// Enhanced Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for API compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
}));

// Compression middleware - compress responses
app.use(compression());

// Request logging - only in development or with specific format
if (!isProduction) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ============================================================================
// DDoS PROTECTION - Rate Limiting Configuration
// ============================================================================

// General API rate limiter - Always enabled for production security
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: (() => {
    const env = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
    if (!Number.isNaN(env)) return env;
    return isProduction ? 100 : 1000; // Stricter limits to prevent abuse
  })(),
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if explicitly disabled via env var (for testing only)
    if (process.env.RATE_LIMIT_ENABLED === "false" && !isProduction) return true;
    // Skip for health check endpoints
    if (req.path === "/health" || req.path === "/api/health") return true;
    return false;
  },
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + (15 * 60 * 1000)).toISOString();
    res.status(429).json({
      error: "Too many requests",
      message: "You have exceeded the rate limit. Please try again later.",
      retryAfter: "15 minutes",
      resetTime: resetTime,
    });
    // Set Retry-After header
    res.setHeader("Retry-After", Math.ceil(15 * 60)); // 15 minutes in seconds
  },
});

// Stricter rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 20, // Stricter limits for auth to prevent brute force
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    // Skip for health check endpoints
    if (req.path === "/health" || req.path === "/api/health") return true;
    return false;
  },
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + (15 * 60 * 1000)).toISOString();
    res.status(429).json({
      error: "Too many requests",
      message: "Too many authentication attempts. Please try again later.",
      retryAfter: "15 minutes",
      resetTime: resetTime,
    });
    res.setHeader("Retry-After", Math.ceil(15 * 60));
  },
});

// Stricter rate limiter for write operations (POST, PUT, PATCH, DELETE)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 300, // Stricter limits for write operations
  message: {
    error: "Too many write requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to write methods
    return !["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  },
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + (15 * 60 * 1000)).toISOString();
    res.status(429).json({
      error: "Too many requests",
      message: "Too many write requests. Please try again later.",
      retryAfter: "15 minutes",
      resetTime: resetTime,
    });
    res.setHeader("Retry-After", Math.ceil(15 * 60));
  },
});

// Apply rate limiters
app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", writeLimiter);

// Request timeout middleware - Prevent long-running requests from consuming resources
const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000; // 30 seconds default
app.use((req, res, next) => {
  req.setTimeout(requestTimeout, () => {
    if (!res.headersSent) {
      res.status(408).json({
        error: "Request timeout",
        message: "The request took too long to process. Please try again.",
      });
    }
  });
  next();
});

// Request size validation - Additional layer of protection
app.use((req, res, next) => {
  const contentLength = req.get("content-length");
  if (contentLength) {
    const sizeInMB = parseInt(contentLength, 10) / (1024 * 1024);
    if (sizeInMB > 10) {
      return res.status(413).json({
        error: "Payload too large",
        message: "Request body exceeds the maximum allowed size of 10MB.",
      });
    }
  }
  next();
});

// Security: Prevent HTTP Parameter Pollution
app.use((req, res, next) => {
  // Remove duplicate query parameters (keep first occurrence)
  if (req.query) {
    const seen = new Set();
    Object.keys(req.query).forEach((key) => {
      if (seen.has(key.toLowerCase())) {
        delete req.query[key];
      } else {
        seen.add(key.toLowerCase());
      }
    });
  }
  next();
});

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
