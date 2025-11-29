const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const supabase = require("./supabase");
const { getProfilePictureUrl } = require("../utils/avatarGenerator");
const { isSpecialAdmin } = require("./admin");

require("dotenv").config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/api/auth/google/callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "Google OAuth env vars not set: GOOGLE_CLIENT_ID /gfi GOOGLE_CLIENT_SECRET"
  );
}

if (!process.env.GOOGLE_CALLBACK_URL) {
  console.warn(
    "⚠️  GOOGLE_CALLBACK_URL not set, using localhost (development mode)"
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google profile:", JSON.stringify(profile, null, 2));

        if (!profile.emails || !profile.emails[0]) {
          console.error("No emails in profile:", profile);
          return done(new Error("No email returned from Google"));
        }

        const email = profile.emails[0].value;
        const name = profile.displayName || profile.name?.givenName || "";

        console.log("Processing email:", email);

        const normalizedEmail = email.toLowerCase();

        const isStudent = normalizedEmail.endsWith("@student.laverdad.edu.ph");
        // Allow standard admin domain and specific personal admin emails
        // See backend/src/config/admin.js for configuration
        const isSpecialAdminEmail = isSpecialAdmin(normalizedEmail);
        const isAdmin =
          normalizedEmail.endsWith("@laverdad.edu.ph") || isSpecialAdminEmail;

        if (!isStudent && !isAdmin) {
          console.error("Invalid email domain:", email);
          return done(new Error("Email domain not allowed"));
        }

        const role = isAdmin ? "admin" : "student";
        console.log("Assigned role:", role);

        // Extract profile picture from Google or generate initials-based avatar
        // Log the profile structure to debug photo extraction
        console.log("Profile photos array:", profile.photos);
        console.log("Profile photos length:", profile.photos?.length);

        const photoUrl = getProfilePictureUrl(profile, name);
        console.log("Extracted/Generated profile picture URL:", photoUrl);

        const userRow = {
          email,
          name,
          role,
          provider: "google",
          provider_id: profile.id,
          photo_url: photoUrl,
          avatar_url: photoUrl, // Keep both fields in sync for compatibility
          updated_at: new Date().toISOString(), // Ensure updated_at is set
        };

        console.log("Upserting user:", userRow);

        // First, try to upsert the user
        const { data: upsertData, error: upsertError } = await supabase
          .from("users")
          .upsert(userRow, {
            onConflict: "email",
            ignoreDuplicates: false, // This ensures existing records are updated
          })
          .select()
          .single();

        if (upsertError) {
          console.error("Supabase upsert error:", upsertError);
          return done(upsertError);
        }

        // Explicitly update photo_url, avatar_url, and role to ensure they're always set
        // This handles cases where upsert might not update existing records properly
        // Also updates role in case admin status changed (e.g., email added to admin config)
        console.log(
          "🔄 Explicitly updating photo_url, avatar_url, and role for email:",
          email
        );
        const { data: updateData, error: updateError } = await supabase
          .from("users")
          .update({
            photo_url: photoUrl,
            avatar_url: photoUrl,
            name: name, // Also update name in case it changed
            role: role, // Update role in case admin status changed
            updated_at: new Date().toISOString(),
          })
          .eq("email", email)
          .select("id, email, name, role, photo_url, avatar_url")
          .single();

        if (updateError) {
          console.error("❌ Supabase update error:", updateError);
          // Don't fail the login if update fails, but log it
          console.warn(
            "Failed to update photo_url, but user was created/updated"
          );
        } else if (updateData) {
          console.log(
            "✅ Update successful - photo_url:",
            updateData.photo_url
          );
          console.log(
            "✅ Update successful - avatar_url:",
            updateData.avatar_url
          );
        } else {
          console.warn(
            "⚠️ Update query returned no data (user might not exist yet)"
          );
        }

        // Use the updated data if available, otherwise use upsert data
        const finalData = updateData || upsertData;

        if (!finalData) {
          console.error("No data returned from Supabase");
          return done(new Error("Failed to create/update user"));
        }

        console.log(
          "✅ Success - Final user data photo_url:",
          finalData.photo_url || finalData.avatar_url || "NOT SET"
        );
        console.log(
          "✅ Final user data:",
          JSON.stringify(
            {
              email: finalData.email,
              name: finalData.name,
              photo_url: finalData.photo_url,
              avatar_url: finalData.avatar_url,
            },
            null,
            2
          )
        );
        return done(null, finalData);
      } catch (err) {
        console.error("Passport strategy error:", err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id || user.email));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
