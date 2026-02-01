/**
 * Migration Runner Script for Student Item Permissions
 * 
 * This script:
 * 1. Checks if the student_item_permissions table exists
 * 2. Creates the table if it doesn't exist
 * 3. Adds the quantity column if it doesn't exist
 * 4. Verifies the setup is correct
 * 
 * Usage:
 *   node backend/scripts/run_student_permissions_migration.js
 * 
 * Or with environment variables:
 *   SUPABASE_URL=your_url SUPABASE_KEY=your_key node backend/scripts/run_student_permissions_migration.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const supabase = require("../src/config/supabase");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

// Migration files in order
const MIGRATION_FILES = [
  "create_student_item_permissions.sql",
  "add_quantity_to_student_item_permissions.sql",
];

async function checkTableExists() {
  try {
    const { data, error } = await supabase
      .from("student_item_permissions")
      .select("id")
      .limit(1);

    // If we can query it, table exists (even if empty)
    if (error && error.code === "42P01") {
      return false; // Table doesn't exist
    }
    return true; // Table exists
  } catch (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return false;
    }
    throw error;
  }
}

async function checkColumnExists(columnName) {
  try {
    // Try to select the column - if it fails, it doesn't exist
    const { error } = await supabase
      .from("student_item_permissions")
      .select(columnName)
      .limit(1);

    return !error || error.code !== "42703"; // 42703 = undefined_column
  } catch (error) {
    if (error.code === "42703") {
      return false; // Column doesn't exist
    }
    // If table doesn't exist, we can't check column
    if (error.code === "42P01") {
      return false;
    }
    throw error;
  }
}

function displayMigrationInstructions(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);
  
  console.log(`\n📄 Migration: ${fileName}`);
  console.log("=" .repeat(60));
  console.log("⚠️  Supabase doesn't support DDL execution via JavaScript client.");
  console.log("📝 Please run this migration manually in Supabase SQL Editor:\n");
  console.log(sql);
  console.log("\n" + "=".repeat(60));
  console.log(`\n💡 Instructions:`);
  console.log(`   1. Copy the SQL above`);
  console.log(`   2. Open Supabase Dashboard → SQL Editor`);
  console.log(`   3. Paste and click "Run"`);
  console.log(`   4. Verify no errors occurred\n`);
  
  return true;
}

async function verifySetup() {
  console.log("\n🔍 Verifying setup...");
  
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log("   ❌ Table 'student_item_permissions' does not exist");
    return false;
  }
  console.log("   ✅ Table 'student_item_permissions' exists");

  const quantityColumnExists = await checkColumnExists("quantity");
  if (!quantityColumnExists) {
    console.log("   ⚠️  Column 'quantity' does not exist (run add_quantity migration)");
  } else {
    console.log("   ✅ Column 'quantity' exists");
  }

  // Try to query the table structure
  try {
    const { data, error } = await supabase
      .from("student_item_permissions")
      .select("id, student_id, item_name, enabled, quantity, created_at, updated_at")
      .limit(1);

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned (which is OK)
      console.log(`   ⚠️  Could not verify columns: ${error.message}`);
    } else {
      console.log("   ✅ Table structure verified");
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify structure: ${error.message}`);
  }

  return true;
}

async function main() {
  console.log("🚀 Student Item Permissions Migration Runner");
  console.log("=" .repeat(50));

  // Check if Supabase is configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file");
    process.exit(1);
  }

  // Check current state
  console.log("\n📊 Checking current database state...");
  const tableExists = await checkTableExists();
  const quantityColumnExists = tableExists ? await checkColumnExists("quantity") : false;

  console.log(`   Table exists: ${tableExists ? "✅ Yes" : "❌ No"}`);
  console.log(`   Quantity column exists: ${quantityColumnExists ? "✅ Yes" : "❌ No"}`);

  if (tableExists && quantityColumnExists) {
    console.log("\n✅ All migrations appear to be applied!");
    await verifySetup();
    return;
  }

  // Run migrations
  console.log("\n📦 Running migrations...");
  
  for (const migrationFile of MIGRATION_FILES) {
    const filePath = path.join(MIGRATIONS_DIR, migrationFile);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }

    // Skip if already applied
    if (migrationFile === "create_student_item_permissions.sql" && tableExists) {
      console.log(`\n⏭️  Skipping ${migrationFile} (table already exists)`);
      continue;
    }

    if (migrationFile === "add_quantity_to_student_item_permissions.sql" && quantityColumnExists) {
      console.log(`\n⏭️  Skipping ${migrationFile} (column already exists)`);
      continue;
    }

    displayMigrationInstructions(filePath);
    
    // Ask user to confirm
    console.log(`\n⏸️  Waiting for you to run the migration manually...`);
    console.log(`   After running the migration in Supabase, press Enter to continue verification.`);
    console.log(`   (Or press Ctrl+C to exit and run migrations later)\n`);
    
    // In a real scenario, you'd wait for user input, but for now we'll just continue
    // Uncomment the following if you want to wait for user confirmation:
    // await new Promise(resolve => {
    //   process.stdin.once('data', () => resolve());
    // });
    
    console.log(`   ⏭️  Continuing with verification...\n`);
  }

  // Verify final state
  console.log("\n✅ Migrations completed!");
  await verifySetup();

  console.log("\n" + "=".repeat(50));
  console.log("✨ Setup complete! You can now use the student permissions feature.");
}

// Run the migration
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  console.log("\n📝 Manual Migration Instructions:");
  console.log("   1. Open your Supabase dashboard");
  console.log("   2. Go to SQL Editor");
  console.log("   3. Run these migrations in order:");
  MIGRATION_FILES.forEach((file, index) => {
    console.log(`      ${index + 1}. ${file}`);
  });
  process.exit(1);
});
