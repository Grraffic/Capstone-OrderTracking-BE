const postgres = require("postgres");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Parse connection string to add better error handling
console.log("🔍 Database connection configuration:");
console.log("  - Using connection pooler (port 6543)");
console.log("  - SSL mode: no-verify");

const sql = postgres(connectionString, {
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
  max: 1, // Reduced to 1 connection for development (Supabase free tier limit)
  idle_timeout: 20, // Reduced idle timeout
  connect_timeout: 30, // Increased from 10 to 30 seconds
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
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`\n🔌 Attempting to connect to PostgreSQL (Attempt ${attempt}/${retries})...`);
      console.log("📍 Database URL:", connectionString.replace(/:.*@/, ":****@")); // Hide password in logs

      // Test the connection with a simple query
      const result = await sql`SELECT 1 as test, current_database() as db, version() as version`;

      console.log("✅ PostgreSQL connection successful!");
      console.log(`📊 Database: ${result[0].db}`);
      console.log(`🔧 PostgreSQL version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);

      return sql;
    } catch (error) {
      console.error(`\n❌ PostgreSQL connection error (Attempt ${attempt}/${retries}):`);
      console.error("Message:", error.message);
      console.error("Code:", error.code);

      if (error.code === 'CONNECT_TIMEOUT') {
        console.error("\n💡 Connection timeout detected. Possible causes:");
        console.error("   1. Supabase pooler might be slow to respond");
        console.error("   2. Network connectivity issues");
        console.error("   3. Database is under heavy load");
        console.error("   4. Firewall blocking the connection");
        console.error("\n🔧 Troubleshooting steps:");
        console.error("   1. Check your internet connection");
        console.error("   2. Verify DATABASE_URL in .env file");
        console.error("   3. Check Supabase dashboard for database status");
        console.error("   4. Try using direct connection (port 5432) instead of pooler (port 6543)");
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < retries) {
        console.log(`\n⏳ Waiting ${delay / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Last attempt failed, throw the error
        console.error("\n❌ All connection attempts failed. Server cannot start.");
        throw error;
      }
    }
  }
};

module.exports = {
  connectDB,
  sql,
};
