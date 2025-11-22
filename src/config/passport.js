const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const supabase = require("./supabase");

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

        const isStudent = email.endsWith("@student.laverdad.edu.ph");
        const isAdmin = email.endsWith("@laverdad.edu.ph");

        if (!isStudent && !isAdmin) {
          console.error("Invalid email domain:", email);
          return done(new Error("Email domain not allowed"));
        }

        const role = isAdmin ? "admin" : "student";
        console.log("Assigned role:", role);

        const userRow = {
          email,
          name,
          role,
          provider: "google",
          provider_id: profile.id,
        };

        console.log("Upserting user:", userRow);

        const { data, error } = await supabase
          .from("users")
          .upsert(userRow, { onConflict: ["email"] })
          .select()
          .single();

        if (error) {
          console.error("Supabase error:", error);
          return done(error);
        }

        if (!data) {
          console.error("No data returned from Supabase");
          return done(new Error("Failed to create/update user"));
        }

        console.log("Success - returning user:", data);
        return done(null, data);
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
