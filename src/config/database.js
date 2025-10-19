const postgres = require("postgres");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = postgres(connectionString, {
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
  max: 10, // Maximum number of connections
  idle_timeout: 30, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
  connection: {
    family: 4, // Force IPv4
  },
});

// Create the connection function
const connectDB = async () => {
  try {
    console.log("Attempting to connect to PostgreSQL...");
    console.log("Database URL:", connectionString.replace(/:.*@/, ":****@")); // Hide password in logs
    await sql`SELECT 1`;
    console.log("✅ PostgreSQL connection successful");
    return sql;
  } catch (error) {
    console.error("❌ PostgreSQL connection error details:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
    throw error;
  }
};

module.exports = {
  connectDB,
  sql,
};
