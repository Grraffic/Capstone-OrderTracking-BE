const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const supabase = require("./supabase");
const { getProfilePictureUrl } = require("../utils/avatarGenerator");
const {
  isSpecialAdmin,
  isSystemAdmin,
  getSpecialAdminEmails,
  getSystemAdminEmails,
} = require("./admin");
const emailRoleAssignmentService = require("../services/system_admin/emailRoleAssignment.service");

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

        // Debug logging
        console.log("🔍 Role determination for email:", normalizedEmail);

        // STEP 1: Check if user already exists in users table (manually created by admin)
        // This allows users with any email domain to log in if they were manually added
        let existingUser = null;
        let role = null;
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, email, role, is_active")
            .eq("email", normalizedEmail)
            .single();

          if (!userError && userData) {
            existingUser = userData;
            // If user exists and is active, use their existing role
            // Note: Inactive user check is handled in auth.controller.js oauthCallback
            // to allow proper redirect to frontend with error parameter
            if (userData.is_active !== false) {
              role = userData.role;
              console.log(
                `✅ Found existing user in database with role: ${role}`
              );
            } else {
              console.warn(
                `⚠️ User ${normalizedEmail} exists but is inactive - will be handled in controller`
              );
              // Don't throw error here - let controller handle redirect to frontend
              // Pass user data so controller can check is_active and redirect properly
            }
          }
        } catch (error) {
          console.warn(
            "⚠️ Error checking existing user in database:",
            error.message
          );
          // Continue to other checks
        }

        // STEP 2: If no existing user found, check email_role_assignments table (system admin assigned roles)
        if (!role) {
          let assignedRole = null;
          try {
            const assignment =
              await emailRoleAssignmentService.getEmailRoleAssignment(
                normalizedEmail
              );
            if (assignment) {
              assignedRole = assignment.role;
              role = assignedRole;
              console.log("✅ Found role assignment in database:", assignedRole);
            }
          } catch (error) {
            console.warn(
              "⚠️ Error checking email_role_assignments:",
              error.message
            );
            // Continue to fallback logic
          }
        }

        // STEP 3: If no assignment found, check for student email
        if (!role) {
          const isStudent = normalizedEmail.endsWith(
            "@student.laverdad.edu.ph"
          );
          if (isStudent) {
            role = "student";
            console.log(
              "✅ Assigning STUDENT role (automatic for @student.laverdad.edu.ph)"
            );
          } else {
            // STEP 3: Check admin.js for initial bootstrap (only for first system admin setup)
            // This is a fallback for initial system admin setup via env vars
            const isSystemAdminEmail = isSystemAdmin(normalizedEmail);
            const isSpecialAdminEmail = isSpecialAdmin(normalizedEmail);

            if (isSystemAdminEmail) {
              role = "system_admin";
              console.log(
                "✅ Assigning SYSTEM_ADMIN role (from env var bootstrap)"
              );
            } else if (isSpecialAdminEmail) {
              role = "property_custodian";
              console.log(
                "✅ Assigning PROPERTY_CUSTODIAN role (from env var bootstrap)"
              );
            } else {
              // No assignment found and not a student email - reject login
              console.error("❌ Invalid email domain:", email);
              console.error("  - Not found in users table");
              console.error("  - Not found in email_role_assignments table");
              console.error(
                "  - Not a student email (@student.laverdad.edu.ph)"
              );
              console.error("  - Not in admin.js bootstrap list");
              return done(
                new Error(
                  "Your email is not allowed. Students must use @student.laverdad.edu.ph and admins must use @laverdad.edu.ph (or the approved admin email on file)."
                )
              );
            }
          }
        }

        console.log("Final assigned role:", role);

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
          // Ensure student fields are NULL for admins (both property_custodian and system_admin)
          course_year_level: role !== "student" ? null : undefined,
          student_number: role !== "student" ? null : undefined,
          education_level: role !== "student" ? null : undefined,
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
        // For admins, ensure student fields are NULL
        console.log(
          "🔄 Explicitly updating photo_url, avatar_url, and role for email:",
          email
        );
        const updatePayload = {
          photo_url: photoUrl,
          avatar_url: photoUrl,
          name: name, // Also update name in case it changed
          role: role, // Update role in case admin status changed
          updated_at: new Date().toISOString(),
        };

        // Ensure student fields are NULL for admins (both property_custodian and system_admin)
        if (role !== "student") {
          updatePayload.course_year_level = null;
          updatePayload.student_number = null;
          updatePayload.education_level = null;
        }

        const { data: updateData, error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
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

        // Ensure user_roles entry exists for this user
        console.log(
          "🔄 Ensuring user_roles entry exists for user:",
          finalData.id
        );
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .upsert(
            {
              user_id: finalData.id,
              role: role,
            },
            {
              onConflict: "user_id,role",
              ignoreDuplicates: false,
            }
          )
          .select()
          .single();

        if (roleError) {
          console.warn("⚠️ Failed to create/update user_roles:", roleError);
          // Don't fail login if role creation fails, but log it
        } else {
          console.log("✅ User role created/updated successfully:", roleData);
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
              role: finalData.role,
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
