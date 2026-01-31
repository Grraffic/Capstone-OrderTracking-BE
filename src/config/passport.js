const passport = require("passport");
const crypto = require("crypto");
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

        // STEP 1: Check if user already exists in students or staff (by email, case-insensitive to avoid duplicates)
        let existingProfile = null;
        let role = null;
        try {
          const { data: studentRow } = await supabase
            .from("students")
            .select("id, user_id, email, name, role")
            .ilike("email", normalizedEmail)
            .limit(1)
            .maybeSingle();
          if (studentRow) {
            existingProfile = { type: "student", ...studentRow, role: "student" };
            role = "student";
            console.log("✅ Found existing student in database");
          }
          if (!existingProfile) {
            const { data: staffRow } = await supabase
              .from("staff")
              .select("id, user_id, email, name, role, status")
              .ilike("email", normalizedEmail)
              .limit(1)
              .maybeSingle();
            if (staffRow) {
              existingProfile = { type: "staff", ...staffRow };
              role = staffRow.role;
              if (staffRow.status === "inactive") {
                console.warn("⚠️ Staff exists but is inactive - will be handled in controller");
              } else {
                console.log(`✅ Found existing staff in database with role: ${role}`);
              }
            }
          }
        } catch (error) {
          console.warn(
            "⚠️ Error checking existing profile in database:",
            error.message
          );
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
              console.error("  - Not found in students/staff");
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

        // Use existing user_id from students/staff, or generate new for first-time login
        // IMPORTANT: Always reuse existing user_id if found to prevent duplicates
        const user_id = existingProfile?.user_id || crypto.randomUUID();

        if (role === "student") {
          // If we found an existing student, always use their user_id to prevent duplicates
          // Check again by email to ensure we have the latest data
          let finalUserId = user_id;
          if (existingProfile && existingProfile.type === "student") {
            finalUserId = existingProfile.user_id;
            console.log("✅ Reusing existing student user_id:", finalUserId);
          }

          const studentRow = {
            user_id: finalUserId,
            name,
            email: normalizedEmail,
            photo_url: photoUrl,
            avatar_url: photoUrl,
            updated_at: new Date().toISOString(),
          };
          
          // Use email as conflict key to prevent duplicates
          // This ensures that if a student with the same email exists, we update it
          // instead of creating a new record
          console.log("Upserting student:", { ...studentRow, role });
          
          // First, try to find existing student by email (case-insensitive)
          const { data: existingStudent, error: findError } = await supabase
            .from("students")
            .select("id, user_id, email")
            .ilike("email", normalizedEmail)
            .limit(1)
            .maybeSingle();
          
          if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
            console.error("Error finding existing student:", findError);
            return done(findError);
          }

          let upsertData;
          let upsertError;

          if (existingStudent) {
            // Student exists - update using their existing user_id
            console.log("Found existing student, updating record:", existingStudent.user_id);
            const updateRow = {
              ...studentRow,
              user_id: existingStudent.user_id, // Always use existing user_id
            };
            const result = await supabase
              .from("students")
              .update(updateRow)
              .eq("user_id", existingStudent.user_id)
              .select()
              .single();
            upsertData = result.data;
            upsertError = result.error;
            finalUserId = existingStudent.user_id;
          } else {
            // New student - insert with new user_id
            console.log("Creating new student record");
            const result = await supabase
              .from("students")
              .insert(studentRow)
              .select()
              .single();
            upsertData = result.data;
            upsertError = result.error;
          }

          if (upsertError) {
            console.error("Supabase students upsert error:", upsertError);
            // If it's a unique constraint violation on email, try to find and update existing
            if (upsertError.code === '23505' || upsertError.message?.includes('unique') || upsertError.message?.includes('duplicate')) {
              console.log("Duplicate email detected, attempting to find and update existing record");
              const { data: duplicateStudent } = await supabase
                .from("students")
                .select("id, user_id, email")
                .ilike("email", normalizedEmail)
                .limit(1)
                .maybeSingle();
              
              if (duplicateStudent) {
                const updateResult = await supabase
                  .from("students")
                  .update({
                    name,
                    photo_url: photoUrl,
                    avatar_url: photoUrl,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("user_id", duplicateStudent.user_id)
                  .select()
                  .single();
                upsertData = updateResult.data;
                upsertError = updateResult.error;
                finalUserId = duplicateStudent.user_id;
              }
            }
            
            if (upsertError) {
              return done(upsertError);
            }
          }

          // Use the user_id from the database result if available, otherwise use finalUserId
          const resultUserId = upsertData?.user_id || finalUserId;
          
          const finalData = {
            id: resultUserId,
            email: normalizedEmail,
            name: upsertData?.name || name,
            role: "student",
            photo_url: upsertData?.photo_url || upsertData?.avatar_url || photoUrl,
            avatar_url: upsertData?.avatar_url || upsertData?.photo_url || photoUrl,
          };
          console.log("✅ Student login success:", finalData.email, "user_id:", resultUserId);
          return done(null, finalData);
        }

        if (["system_admin", "property_custodian", "finance_staff", "accounting_staff", "department_head"].includes(role)) {
          const staffRow = {
            user_id,
            name,
            email: normalizedEmail,
            role,
            status: existingProfile?.status === "inactive" ? "inactive" : "active",
            photo_url: photoUrl,
            avatar_url: photoUrl,
            updated_at: new Date().toISOString(),
          };
          console.log("Upserting staff:", staffRow);
          const { data: upsertData, error: upsertError } = await supabase
            .from("staff")
            .upsert(staffRow, { onConflict: "user_id", ignoreDuplicates: false })
            .select()
            .single();
          if (upsertError) {
            console.error("Supabase staff upsert error:", upsertError);
            return done(upsertError);
          }
          const finalData = {
            id: user_id,
            email: normalizedEmail,
            name,
            role,
            photo_url: photoUrl,
            avatar_url: photoUrl,
          };
          console.log("✅ Staff login success:", finalData.email, "role:", finalData.role);
          return done(null, finalData);
        }

        return done(new Error("Invalid role after determination"));
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
