const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const supabase = require("./supabase");

require("dotenv").config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = "http://localhost:5000/api/auth/google/callback"; // Hardcoded for development

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "Google OAuth env vars not set: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET"
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
        const email =
          profile.emails && profile.emails[0] && profile.emails[0].value;
        const name = profile.displayName || profile.name?.givenName || "";

        if (!email) return done(new Error("No email returned from Google"));

        const isStudent = email.endsWith("@student.laverdad.edu.ph");
        const isAdmin = email.endsWith("@laverdad.edu.ph");
        const role = isAdmin ? "admin" : isStudent ? "student" : "staff";

        const userRow = {
          email,
          name,
          role,
          provider: "google",
          provider_id: profile.id,
        };

        const { data, error } = await supabase
          .from("users")
          .upsert(userRow, { onConflict: ["email"] })
          .select()
          .single();

        if (error) return done(error);

        return done(null, data);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id || user.email));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
