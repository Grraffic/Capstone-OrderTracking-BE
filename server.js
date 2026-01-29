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

// Rate limiting - disabled by default for testing; set RATE_LIMIT_ENABLED=true to enable in production
const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === "true";
if (rateLimitEnabled) {
  const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
  const rateLimitMax = (() => {
    const env = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
    if (!Number.isNaN(env)) return env;
    return isProduction ? 300 : 1000;
  })();
  const limiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);
}

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
