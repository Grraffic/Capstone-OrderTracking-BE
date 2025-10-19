require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const passport = require("passport");
// const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
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
