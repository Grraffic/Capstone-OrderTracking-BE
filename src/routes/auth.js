const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");
const { resolveProfile, getStudentIdForUser } = require("../services/profileResolver.service");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  authController.oauthCallback
);

// Max quantities per item for current student (requires student auth).
// Also returns alreadyOrdered: { "jogging pants": 1, ... } from placed orders (pending/paid/claimed).
router.get("/max-quantities", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const { getMaxQuantitiesForStudent, resolveItemKey } = require("../config/itemMaxOrder");
    const tokenUser = req.user;
    if (!tokenUser?.email && !tokenUser?.id) {
      return res.status(401).json({ message: "Invalid token: missing email", error: "invalid_token" });
    }

    const resolved = await resolveProfile(tokenUser);
    if (!resolved) {
      return res.status(404).json({ message: "User profile not found. Please try logging in again.", error: "profile_not_found" });
    }
    if (resolved.type !== "student" && resolved.role !== "student") {
      return res.status(403).json({
        message: "Max quantities are only available for students",
        error: "not_student",
      });
    }

    const data = resolved.row;
    const studentIdForOrders =
      resolved.type === "student"
        ? resolved.id
        : resolved.role === "student"
          ? (await getStudentIdForUser(tokenUser.id)) || tokenUser.id
          : tokenUser.id;

    // Map Preschool/Prekindergarten → Kindergarten for segment lookup; use student_type from DB or default "new"
    const rawLevel = data.education_level || null;
    const educationLevel =
      rawLevel === "Preschool" || rawLevel === "Prekindergarten"
        ? "Kindergarten"
        : rawLevel;
    const studentType = (data.student_type || "new").toLowerCase();
    const gender = data.gender || null;

    // Derived Total Item Limit defaults based on student type.
    // System admins can override via total_item_limit on users; if not set, we fall back to these values.
    const baseTotalItemLimit =
      studentType === "new" ? 8 :
      studentType === "old" ? 2 :
      null;
    const effectiveTotalItemLimit =
      data.total_item_limit != null && Number(data.total_item_limit) > 0
        ? Number(data.total_item_limit)
        : baseTotalItemLimit;

    if (!gender && educationLevel) {
      // Still compute maxQuantities by merging both genders (so e.g. Logo Patch max 3 works)
      const female = getMaxQuantitiesForStudent(educationLevel, studentType, "Female");
      const male = getMaxQuantitiesForStudent(educationLevel, studentType, "Male");
      const maxQuantitiesNoGender = {};
      const allKeys = new Set([...Object.keys(female), ...Object.keys(male)]);
      for (const key of allKeys) {
        maxQuantitiesNoGender[key] = Math.max(
          Number(female[key]) || 0,
          Number(male[key]) || 0
        );
      }
      // Still compute alreadyOrdered so the UI can disable items the user has already ordered
      const email = (tokenUser.email || "").trim();
      const orParts = [];
      if (studentIdForOrders) orParts.push(`student_id.eq.${studentIdForOrders}`);
      if (email) orParts.push(`student_email.eq.${email}`);
      let alreadyOrdered = {};
      if (orParts.length > 0) {
        const placedStatusesIncomplete = ["pending", "paid", "claimed", "processing", "ready", "payment_pending", "completed"];
        const { data: placedOrders } = await supabase
          .from("orders")
          .select("items")
          .eq("is_active", true)
          .in("status", placedStatusesIncomplete)
          .or(orParts.join(","));
        for (const row of placedOrders || []) {
          const orderItems = Array.isArray(row.items) ? row.items : [];
          for (const it of orderItems) {
            const rawName = (it.name || "").trim();
            let key = resolveItemKey(rawName);
            if (!key && rawName) {
              const lower = rawName.toLowerCase();
              if (lower.includes("jogging pants")) key = "jogging pants";
              if (lower.includes("logo patch")) key = "logo patch";
            }
            if (key && typeof key === "string" && key.toLowerCase().includes("logo patch")) key = "logo patch";
            if (key) alreadyOrdered[key] = (alreadyOrdered[key] || 0) + (Number(it.quantity) || 0);
          }
        }
      }
      const slotsUsedFromPlacedOrders = Object.keys(alreadyOrdered).length;
      return res.status(200).json({
        maxQuantities: maxQuantitiesNoGender,
        alreadyOrdered,
        profileIncomplete: true,
        message: "Complete your profile (gender) to see order limits.",
        totalItemLimit: effectiveTotalItemLimit ?? null,
        slotsUsedFromPlacedOrders,
      });
    }

    const maxQuantities = getMaxQuantitiesForStudent(
      educationLevel,
      studentType,
      gender
    );

    // Sum quantities per item from this student's placed orders.
    // Include all statuses that appear in the student's "Orders" and "Claimed" tabs so "already ordered" matches what they see.
    const placedStatuses = ["pending", "paid", "claimed", "processing", "ready", "payment_pending", "completed"];
    const email = (tokenUser.email || "").trim();
    const orParts = [];
    if (studentIdForOrders) orParts.push(`student_id.eq.${studentIdForOrders}`);
    if (email) orParts.push(`student_email.eq.${email}`);
    if (orParts.length === 0 && email) orParts.push(`student_email.eq.${email}`);
    let alreadyOrdered = {};
    if (orParts.length > 0) {
      const orFilter = orParts.join(",");
      const { data: placedOrders, error: ordersErr } = await supabase
        .from("orders")
        .select("items")
        .eq("is_active", true)
        .in("status", placedStatuses)
        .or(orFilter);
      if (ordersErr) {
        console.error("Max quantities: placed orders query error", ordersErr);
      }
      for (const row of placedOrders || []) {
        const orderItems = Array.isArray(row.items) ? row.items : [];
        for (const it of orderItems) {
          const rawName = (it.name || "").trim();
          let key = resolveItemKey(rawName);
          if (!key && rawName) {
            const lower = rawName.toLowerCase();
            if (lower.includes("jogging pants")) key = "jogging pants";
            if (lower.includes("logo patch")) key = "logo patch";
          }
          if (key && typeof key === "string" && key.toLowerCase().includes("logo patch")) key = "logo patch";
          if (!key) continue;
          alreadyOrdered[key] = (alreadyOrdered[key] || 0) + (Number(it.quantity) || 0);
        }
      }
      // Debug: confirm placed orders are included in alreadyOrdered
      const orderCount = placedOrders?.length ?? 0;
      const keys = Object.keys(alreadyOrdered);
      if (orderCount > 0 || keys.length > 0) {
        console.log("Max quantities: alreadyOrdered from", orderCount, "placed order(s) -> keys:", keys.join(", ") || "(none)");
      }
    }

    const slotsUsedFromPlacedOrders = Object.keys(alreadyOrdered || {}).length;

    // Voided = total_item_limit set to 0 by auto-void (unclaimed). Only block if they also have placed orders
    // (so we don't block a student who has no orders/claimed items—voided orders are cancelled and don't show there).
    const blockedDueToVoid =
      data.total_item_limit === 0 && slotsUsedFromPlacedOrders > 0;

    return res.json({
      maxQuantities,
      alreadyOrdered,
      totalItemLimit: blockedDueToVoid ? 0 : (effectiveTotalItemLimit ?? null),
      slotsUsedFromPlacedOrders,
      blockedDueToVoid,
    });
  } catch (err) {
    console.error("Max quantities endpoint error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Profile endpoint - returns user info from token (students/staff first, fallback to users)
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const tokenUser = req.user; // from JWT payload
    if (!tokenUser?.email && !tokenUser?.id) {
      return res.status(401).json({ message: "Invalid token: missing email/id", error: "invalid_token" });
    }
    const resolved = await resolveProfile(tokenUser);
    if (!resolved) {
      return res.status(404).json({ message: "Profile not found. Please try logging in again.", error: "profile_not_found" });
    }

    const { type, row: data, role: userRole } = resolved;
    const isStaff = type === "staff";
    const isInactive = type === "staff" ? data.status === "inactive" : (type === "user" && data.is_active === false);
    if (isInactive) {
      return res.status(403).json({
        message: "Account is inactive",
        error: "account_inactive",
        is_active: false,
      });
    }

    let emailString = tokenUser.email;
    if (typeof emailString !== "string") {
      emailString = (emailString?.email || emailString?.value || String(emailString) || "").trim();
    }
    if (!emailString && data?.email) emailString = data.email;

    const profile = {
      id: tokenUser.id,
      email: emailString,
      role: userRole,
      name: data?.name || null,
      photoURL: data?.photo_url || data?.avatar_url || null,
      is_active: type === "staff" ? data?.status !== "inactive" : (data?.is_active !== false),
      courseYearLevel: isStaff ? null : (data?.course_year_level || null),
      studentNumber: isStaff ? null : (data?.student_number || null),
      educationLevel: isStaff ? null : (data?.education_level || null),
      gender: isStaff ? null : (data?.gender || null),
      studentType: isStaff ? null : (data?.student_type || null),
      onboardingCompleted: isStaff ? null : (data?.onboarding_completed ?? false),
      onboarding_completed: isStaff ? null : (data?.onboarding_completed ?? false),
      onboardingCompletedAt: isStaff ? null : (data?.onboarding_completed_at ?? null),
      onboarding_completed_at: isStaff ? null : (data?.onboarding_completed_at ?? null),
    };

    console.log("📸 Profile endpoint - source:", type, "role:", userRole);
    return res.json(profile);
  } catch (err) {
    console.error("Profile GET endpoint error:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err?.message }),
    });
  }
});

// Upload profile image endpoint - uploads image to Cloudinary and returns URL
router.post("/profile/upload-image", verifyToken, async (req, res) => {
  try {
    const { image, fileName } = req.body;
    const tokenUser = req.user; // from JWT payload

    if (!image || !fileName) {
      return res
        .status(400)
        .json({ message: "Image and fileName are required" });
    }

    // Import Cloudinary service
    const {
      uploadProfileImage,
      deleteOldProfileImage,
    } = require("../services/cloudinary.service");
    const supabase = require("../config/supabase");

    const resolved = await resolveProfile(tokenUser);
    let oldPhotoUrl = null;
    if (resolved?.type === "student") {
      const { data: row } = await supabase.from("students").select("photo_url").eq("id", resolved.id).maybeSingle();
      oldPhotoUrl = row?.photo_url;
    } else if (resolved?.type === "staff") {
      const { data: row } = await supabase.from("staff").select("photo_url").eq("id", resolved.id).maybeSingle();
      oldPhotoUrl = row?.photo_url;
    }

    // Upload image to Cloudinary
    console.log(`📤 Uploading profile image for user: ${tokenUser.email}`);
    const uploadResult = await uploadProfileImage(image, tokenUser.id);

    if (!uploadResult.success) {
      return res.status(500).json({
        message: "Failed to upload image to Cloudinary",
        details: uploadResult.error || "Unknown error",
      });
    }

    // Delete old image from Cloudinary if it exists
    if (oldPhotoUrl) {
      console.log(`🗑️ Attempting to delete old profile image...`);
      await deleteOldProfileImage(oldPhotoUrl);
      // Don't fail the request if deletion fails - new image is already uploaded
    }

    console.log(`✅ Profile image uploaded successfully: ${uploadResult.url}`);

    // Return Cloudinary URL
    return res.json({ imageUrl: uploadResult.url });
  } catch (err) {
    console.error("❌ Image upload error:", err);

    // Provide more specific error messages
    let errorMessage = "Failed to upload image";
    if (err.message) {
      errorMessage = err.message;
    }

    return res.status(500).json({
      message: errorMessage,
      details: err.message || "Unknown error",
    });
  }
});

// Normalize gender for DB constraint: 'Male' | 'Female' | null
function normalizeGender(value) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "male") return "Male";
  if (lower === "female") return "Female";
  return s; // already "Male"/"Female" or invalid (DB will reject)
}

// Update profile endpoint - updates user profile (students/staff first, fallback to users)
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const tokenUser = req.user;
    if (!tokenUser?.email && !tokenUser?.id) {
      return res.status(401).json({ message: "Invalid token: missing email", error: "invalid_token" });
    }
    const supabase = require("../config/supabase");
    const { name, photoURL, courseYearLevel, studentNumber, educationLevel, gender, studentType } =
      req.body;

    const resolved = await resolveProfile(tokenUser);
    if (!resolved) {
      return res.status(404).json({ message: "Profile not found", error: "profile_not_found" });
    }
    const currentUser = resolved.row;
    const userRole = resolved.role;
    const isAdmin = resolved.type === "staff" || ["property_custodian", "system_admin"].includes(userRole);

    // Prepare update data (core fields that exist on all schemas)
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name && typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (photoURL) {
      updateData.photo_url = photoURL;
      updateData.avatar_url = photoURL;
    }

    if (!isAdmin) {
      if (courseYearLevel !== undefined) updateData.course_year_level = courseYearLevel;
      if (studentNumber !== undefined) updateData.student_number = studentNumber;
      if (educationLevel !== undefined) updateData.education_level = educationLevel;
    } else {
      updateData.course_year_level = null;
      updateData.student_number = null;
      updateData.education_level = null;
    }

    // Determine if onboarding should be marked complete (students only)
    const nextCourseYearLevel =
      courseYearLevel !== undefined ? courseYearLevel : currentUser?.course_year_level;
    const nextStudentNumber =
      studentNumber !== undefined ? studentNumber : currentUser?.student_number;
    const nextEducationLevel =
      educationLevel !== undefined ? educationLevel : currentUser?.education_level;
    const nextGender =
      gender !== undefined ? normalizeGender(gender) : currentUser?.gender;
    const nextStudentType =
      studentType !== undefined ? studentType : currentUser?.student_type;

    const isNonEmpty = (v) =>
      v !== null &&
      v !== undefined &&
      String(v).trim() !== "" &&
      String(v).trim().toLowerCase() !== "n/a";

    const shouldMarkOnboardingComplete =
      !isAdmin &&
      isNonEmpty(nextCourseYearLevel) &&
      isNonEmpty(nextStudentNumber) &&
      isNonEmpty(nextEducationLevel) &&
      isNonEmpty(nextGender) &&
      isNonEmpty(nextStudentType);

    if (shouldMarkOnboardingComplete && currentUser?.onboarding_completed !== true) {
      updateData.onboarding_completed = true;
      // Only set once if possible
      if (!currentUser?.onboarding_completed_at) {
        updateData.onboarding_completed_at = new Date().toISOString();
      }
    }

    // Core select columns (always exist in current schema)
    const selectCore =
      "email, name, role, avatar_url, photo_url, course_year_level, student_number, education_level, onboarding_completed, onboarding_completed_at";

    // Normalize gender for DB constraint (Male/Female)
    const genderValue = gender !== undefined ? normalizeGender(gender) : undefined;

    let data = null;
    let error = null;
    const isColumnError = (e) =>
      e && (String(e.message || "").toLowerCase().includes("does not exist") || String(e.message || "").toLowerCase().includes("column"));

    if (resolved.type === "student") {
      const studentUpdate = { ...updateData };
      if (genderValue !== undefined) studentUpdate.gender = genderValue;
      if (studentType !== undefined) studentUpdate.student_type = studentType === null || studentType === "" ? null : studentType;
      const result = await supabase
        .from("students")
        .update(studentUpdate)
        .eq("id", resolved.id)
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    } else if (resolved.type === "staff") {
      const result = await supabase
        .from("staff")
        .update(updateData)
        .eq("id", resolved.id)
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Supabase profile update error:", error);
      return res.status(500).json({
        message: "Failed to update profile",
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = {
      id: tokenUser.id,
      email: data.email || tokenUser.email,
      role: data.role ?? userRole,
      name: data.name,
      photoURL: data.photo_url || data.avatar_url,
      courseYearLevel: isAdmin ? null : (data.course_year_level || null),
      studentNumber: isAdmin ? null : (data.student_number || null),
      educationLevel: isAdmin ? null : (data.education_level || null),
      gender: isAdmin ? null : (data.gender ?? null),
      studentType: isAdmin ? null : (data.student_type ?? null),
      onboardingCompleted: isAdmin ? null : (data.onboarding_completed ?? false),
      onboarding_completed: isAdmin ? null : (data.onboarding_completed ?? false),
      onboardingCompletedAt: isAdmin ? null : (data.onboarding_completed_at ?? null),
      onboarding_completed_at: isAdmin ? null : (data.onboarding_completed_at ?? null),
    };

    return res.json(profile);
  } catch (err) {
    console.error("Profile PUT endpoint error:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err?.message }),
    });
  }
});

// Refresh profile picture endpoint - updates profile picture for students/staff
router.post("/profile/refresh-picture", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const { resolveProfile } = require("../services/profileResolver.service");
    const tokenUser = req.user;

    const resolved = await resolveProfile(tokenUser);
    if (!resolved) {
      return res.status(404).json({ message: "User not found" });
    }

    const current = resolved.row;
    let photoUrl = current.photo_url || current.avatar_url;
    if (!photoUrl) {
      const { generateInitialsAvatar } = require("../utils/avatarGenerator");
      photoUrl = generateInitialsAvatar(current.name || current.email);
    }

    const table = resolved.type === "student" ? "students" : "staff";
    const { data: updatedUser, error: updateError } = await supabase
      .from(table)
      .update({
        photo_url: photoUrl,
        avatar_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolved.id)
      .select("email, name, photo_url, avatar_url")
      .single();

    if (updateError) {
      console.error("Error updating profile picture:", updateError);
      return res.status(500).json({
        message: "Failed to update profile picture",
        details: updateError.message,
      });
    }

    return res.json({
      success: true,
      message: "Profile picture refreshed",
      photoURL: updatedUser.photo_url || updatedUser.avatar_url,
      photo_url: updatedUser.photo_url,
      avatar_url: updatedUser.avatar_url,
    });
  } catch (err) {
    console.error("Profile refresh error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Logout (stateless) - client should clear token
router.post("/logout", (req, res) => {
  // If you had server-side sessions, invalidate them here. For JWT stateless, simply respond OK.
  res.json({ message: "Logged out" });
});

module.exports = router;
