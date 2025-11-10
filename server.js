require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const passport = require("passport");
// const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

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

// Passport initialization
app.use(passport.initialize());

//API ROUTES
app.use("/api", routes);

const { connectDB } = require("./src/config/database");

// Start server after DB check
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(
      "Failed to initialize DB, server not started:",
      err.message || err
    );
    process.exit(1);
  });
