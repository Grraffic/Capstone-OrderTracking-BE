const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Supabase environment variables SUPABASE_URL or SUPABASE_SERVICE_KEY are not set"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-application-name": "your-app-name",
    },
  },
});

// Test the Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log("✅ Supabase connection successful");
  } catch (error) {
    console.error("❌ Supabase connection error:", error.message);
    throw error;
  }
};

// Run the test connection
testSupabaseConnection();

module.exports = supabase;
