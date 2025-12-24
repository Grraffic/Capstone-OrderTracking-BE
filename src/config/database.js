const postgres = require("postgres");
require("dotenv").config();

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// For production deployments (Render), use direct connection instead of pooler
// Pooler (6543) can timeout on some hosting platforms
const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER;
const useDirectConnection =
  process.env.USE_DIRECT_CONNECTION === "true" || isProduction;

// Convert pooler connection (6543) to direct connection (5432) if needed
if (useDirectConnection && connectionString.includes(":6543")) {
  connectionString = connectionString.replace(":6543", ":5432");
  console.log("🔍 Database connection configuration:");
  console.log("  - Using DIRECT connection (port 5432) for production");
} else if (connectionString.includes(":6543")) {
  console.log("🔍 Database connection configuration:");
  console.log("  - Using Supabase pgbouncer pooler (port 6543)");
} else {
  console.log("🔍 Database connection configuration:");
  console.log("  - Using connection from DATABASE_URL");
}

console.log("  - Prepared statements: DISABLED (pgbouncer compatibility)");
console.log("  - SSL mode: no-verify");

const sql = postgres(connectionString, {
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
  prepare: false, // CRITICAL: Disable prepared statements for pgbouncer compatibility
  max: isProduction ? 2 : 1, // Allow 2 connections in production, 1 for development
  idle_timeout: 20, // Reduced idle timeout
  connect_timeout: isProduction ? 60 : 30, // Longer timeout for production (60s) vs dev (30s)
  connection: {
    application_name: "capstone-backend",
  },
  // Add retry logic
  max_lifetime: 60 * 10, // 10 minutes (reduced from 30)
  // Better error handling
  onnotice: () => {}, // Suppress notices
  debug: false, // Set to true for debugging
});

// Create the connection function with retry logic
const connectDB = async (retries = 3, delay = 2000) => {
  // Increase retries and delay for production
  const finalRetries = isProduction ? 5 : retries;
  const finalDelay = isProduction ? 5000 : delay; // 5 seconds between retries in production

  for (let attempt = 1; attempt <= finalRetries; attempt++) {
    try {
      console.log(
        `\n🔌 Attempting to connect to PostgreSQL (Attempt ${attempt}/${finalRetries})...`
      );
      console.log(
        "📍 Database URL:",
        connectionString.replace(/:.*@/, ":****@")
      ); // Hide password in logs

      // Test the connection with a simple query
      const result =
        await sql`SELECT 1 as test, current_database() as db, version() as version`;

      console.log("✅ PostgreSQL connection successful!");
      console.log(`📊 Database: ${result[0].db}`);
      console.log(
        `🔧 PostgreSQL version: ${result[0].version.split(" ")[0]} ${
          result[0].version.split(" ")[1]
        }`
      );

      return sql;
    } catch (error) {
      console.error(
        `\n❌ PostgreSQL connection error (Attempt ${attempt}/${finalRetries}):`
      );
      console.error("Message:", error.message);
      console.error("Code:", error.code);

      if (error.code === "CONNECT_TIMEOUT") {
        console.error("\n💡 Connection timeout detected. Possible causes:");
        console.error("   1. Supabase pooler might be slow to respond");
        console.error("   2. Network connectivity issues");
        console.error("   3. Database is under heavy load");
        console.error("   4. Firewall blocking the connection");
        console.error("\n🔧 Troubleshooting steps:");
        console.error("   1. Check your internet connection");
        console.error("   2. Verify DATABASE_URL in .env file");
        console.error("   3. Check Supabase dashboard for database status");
        if (connectionString.includes(":6543")) {
          console.error(
            "   4. ⚠️  Using pooler (6543). Consider switching to direct connection (5432)"
          );
          console.error(
            "      Set USE_DIRECT_CONNECTION=true or ensure NODE_ENV=production"
          );
        } else {
          console.error("   4. Using direct connection (5432)");
        }
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < finalRetries) {
        console.log(
          `\n⏳ Waiting ${finalDelay / 1000} seconds before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, finalDelay));
      } else {
        // Last attempt failed, throw the error
        console.error(
          "\n❌ All connection attempts failed. Server cannot start."
        );
        throw error;
      }
    }
  }
};

module.exports = {
  connectDB,
  sql,
};
