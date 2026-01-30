const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");

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
    if (!tokenUser?.email) {
      return res.status(401).json({ message: "Invalid token: missing email", error: "invalid_token" });
    }

    // Load user profile; retry with fewer columns if gender/student_type/education_level don't exist yet
    let data = null;
    let error = null;
    let result = await supabase
      .from("users")
      .select("id, role, education_level, gender, student_type, max_items_per_order, max_items_per_order_set_at")
      .eq("email", tokenUser.email)
      .maybeSingle();
    data = result.data;
    error = result.error;

    if (error && (String(error.message || "").toLowerCase().includes("does not exist") || String(error.message || "").toLowerCase().includes("column"))) {
      result = await supabase
        .from("users")
        .select("id, role, education_level, max_items_per_order, max_items_per_order_set_at")
        .eq("email", tokenUser.email)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }
    if (error && (String(error.message || "").toLowerCase().includes("does not exist") || String(error.message || "").toLowerCase().includes("column"))) {
      result = await supabase
        .from("users")
        .select("id, role")
        .eq("email", tokenUser.email)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Max quantities: profile fetch error", error);
      return res.status(500).json({ message: "Failed to load profile", details: error.message });
    }
    if (!data) {
      return res.status(404).json({ message: "User profile not found. Please try logging in again.", error: "profile_not_found" });
    }

    const role = data.role || tokenUser.role;
    if (role !== "student") {
      return res.status(403).json({
        message: "Max quantities are only available for students",
        error: "not_student",
      });
    }

    // Map Preschool/Prekindergarten → Kindergarten for segment lookup; use student_type from DB or default "new"
    const rawLevel = data.education_level || null;
    const educationLevel =
      rawLevel === "Preschool" || rawLevel === "Prekindergarten"
        ? "Kindergarten"
        : rawLevel;
    const studentType = (data.student_type || "new").toLowerCase();
    const gender = data.gender || null;

    // Derived Max Items Per Order defaults based on student type.
    // System admins can override via max_items_per_order on users; if not set, we fall back to these values.
    const baseMaxItemsPerOrder =
      studentType === "new" ? 8 :
      studentType === "old" ? 2 :
      null;
    const effectiveMaxItemsPerOrder =
      data.max_items_per_order != null && Number(data.max_items_per_order) > 0
        ? Number(data.max_items_per_order)
        : baseMaxItemsPerOrder;

    if (!gender && educationLevel) {
      // Still compute alreadyOrdered so the UI can disable items the user has already ordered
      const email = (tokenUser.email || "").trim();
      const orParts = [];
      if (tokenUser.id) orParts.push(`student_id.eq.${tokenUser.id}`);
      if (data.id && String(data.id) !== String(tokenUser.id)) orParts.push(`student_id.eq.${data.id}`);
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
        maxQuantities: {},
        alreadyOrdered,
        profileIncomplete: true,
        message: "Complete your profile (gender) to see order limits.",
        maxItemsPerOrder: effectiveMaxItemsPerOrder ?? null,
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
    if (tokenUser.id) orParts.push(`student_id.eq.${tokenUser.id}`);
    if (data.id && String(data.id) !== String(tokenUser.id)) orParts.push(`student_id.eq.${data.id}`);
    if (email) orParts.push(`student_email.eq.${email}`);
    // Defensive: ensure we have at least one condition when we have the user's email
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

    // Voided = max_items_per_order set to 0 by auto-void (unclaimed). Only block if they also have placed orders
    // (so we don't block a student who has no orders/claimed items—voided orders are cancelled and don't show there).
    const blockedDueToVoid =
      data.max_items_per_order === 0 && slotsUsedFromPlacedOrders > 0;

    return res.json({
      maxQuantities,
      alreadyOrdered,
      maxItemsPerOrder: blockedDueToVoid ? 0 : (effectiveMaxItemsPerOrder ?? null),
      slotsUsedFromPlacedOrders,
      blockedDueToVoid,
    });
  } catch (err) {
    console.error("Max quantities endpoint error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Profile endpoint - returns user info from token
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const tokenUser = req.user; // from JWT payload
    // Try full select first (includes gender, student_type if columns exist)
    let data = null;
    let error = null;
    let result = await supabase
      .from("users")
      .select(
        "email, name, role, avatar_url, photo_url, course_year_level, student_number, education_level, is_active, gender, student_type, onboarding_completed, onboarding_completed_at"
      )
      .eq("email", tokenUser.email)
      .maybeSingle();
    data = result.data;
    error = result.error;

    // If column(s) like gender/student_type don't exist yet, retry without them
    if (error && (error.message || "").toLowerCase().includes("does not exist")) {
      result = await supabase
        .from("users")
        .select(
          "email, name, role, avatar_url, photo_url, course_year_level, student_number, education_level, is_active, onboarding_completed, onboarding_completed_at"
        )
        .eq("email", tokenUser.email)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }
    // If onboarding columns are missing (older DB), retry without them as well
    if (error && (error.message || "").toLowerCase().includes("does not exist")) {
      result = await supabase
        .from("users")
        .select(
          "email, name, role, avatar_url, photo_url, course_year_level, student_number, education_level, is_active"
        )
        .eq("email", tokenUser.email)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    // Check if user is inactive
    if (data && data.is_active === false) {
      return res.status(403).json({ 
        message: "Account is inactive",
        error: "account_inactive",
        is_active: false
      });
    }

    if (error) {
      console.warn("Supabase profile fetch error:", error.message || error);
    }

    // Ensure email is always a string
    let emailString = tokenUser.email;
    if (typeof emailString !== "string") {
      emailString = (
        emailString?.email ||
        emailString?.value ||
        String(emailString) ||
        ""
      ).trim();
    }

    const userRole = data?.role || tokenUser.role;
    const isAdmin = userRole === "property_custodian" || userRole === "system_admin";

    const profile = {
      id: tokenUser.id,
      email: emailString,
      role: userRole,
      name: data?.name || null,
      photoURL: data?.photo_url || data?.avatar_url || null,
      is_active: data?.is_active !== undefined ? data.is_active : true, // Default to true if not set
      // Only include student fields for students, set to null for admins
      courseYearLevel: isAdmin ? null : (data?.course_year_level || null),
      studentNumber: isAdmin ? null : (data?.student_number || null),
      educationLevel: isAdmin ? null : (data?.education_level || null),
      gender: isAdmin ? null : (data?.gender || null),
      studentType: isAdmin ? null : (data?.student_type || null),
      onboardingCompleted: isAdmin ? null : (data?.onboarding_completed ?? false),
      onboarding_completed: isAdmin ? null : (data?.onboarding_completed ?? false),
      onboardingCompletedAt: isAdmin ? null : (data?.onboarding_completed_at ?? null),
      onboarding_completed_at: isAdmin ? null : (data?.onboarding_completed_at ?? null),
    };

    // Debug logging to verify photo URL is being returned
    console.log("📸 Profile endpoint - Returning profile data:");
    console.log("  - photo_url from DB:", data?.photo_url);
    console.log("  - avatar_url from DB:", data?.avatar_url);
    console.log("  - photoURL in response:", profile.photoURL);
    console.log("  - user role:", userRole, "isAdmin:", isAdmin);

    return res.json(profile);
  } catch (err) {
    console.error("Profile endpoint error:", err);
    return res.status(500).json({ message: "Internal server error" });
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

    // Get user's current photo URL to delete old image
    const { data: userData } = await supabase
      .from("users")
      .select("photo_url")
      .eq("email", tokenUser.email)
      .maybeSingle();

    const oldPhotoUrl = userData?.photo_url;

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

// Update profile endpoint - updates user profile information
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const tokenUser = req.user; // from JWT payload
    const { name, photoURL, courseYearLevel, studentNumber, educationLevel, gender, studentType } =
      req.body;

    // Load current user (needed for role + onboarding completion checks).
    // Retry with fewer columns if some optional columns don't exist yet.
    let currentUser = null;
    {
      let cur = await supabase
        .from("users")
        .select(
          "role, course_year_level, student_number, education_level, gender, student_type, onboarding_completed, onboarding_completed_at"
        )
        .eq("email", tokenUser.email)
        .maybeSingle();
      if (cur.error && (String(cur.error.message || "").toLowerCase().includes("does not exist") || String(cur.error.message || "").toLowerCase().includes("column"))) {
        cur = await supabase
          .from("users")
          .select("role, course_year_level, student_number, education_level, onboarding_completed, onboarding_completed_at")
          .eq("email", tokenUser.email)
          .maybeSingle();
      }
      if (cur.error && (String(cur.error.message || "").toLowerCase().includes("does not exist") || String(cur.error.message || "").toLowerCase().includes("column"))) {
        cur = await supabase
          .from("users")
          .select("role, course_year_level, student_number, education_level")
          .eq("email", tokenUser.email)
          .maybeSingle();
      }
      currentUser = cur.data || null;
    }

    const userRole = currentUser?.role || tokenUser.role;
    const isAdmin = userRole === "property_custodian" || userRole === "system_admin";

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

    // Try update with optional gender/student_type if not admin (columns may not exist yet)
    let data = null;
    let error = null;

    if (!isAdmin && (genderValue !== undefined || studentType !== undefined)) {
      const updateWithOptional = { ...updateData };
      if (genderValue !== undefined) updateWithOptional.gender = genderValue;
      if (studentType !== undefined) updateWithOptional.student_type = studentType === null || studentType === "" ? null : studentType;
      // Only select columns we're updating (student_type column may not exist in DB yet)
      const selectOptional = [selectCore];
      if (genderValue !== undefined) selectOptional.push("gender");
      if (studentType !== undefined) selectOptional.push("student_type");
      const result = await supabase
        .from("users")
        .update(updateWithOptional)
        .eq("email", tokenUser.email)
        .select(selectOptional.join(", "))
        .single();
      data = result.data;
      error = result.error;
    }

    // If failed with "column does not exist", retry with updateData and gender only (gender column exists; student_type may not)
    if (error && (String(error.message || "").toLowerCase().includes("does not exist") || String(error.message || "").toLowerCase().includes("column"))) {
      const fallbackUpdate = { ...updateData };
      if (genderValue !== undefined) fallbackUpdate.gender = genderValue;
      const fallbackSelect = Object.keys(fallbackUpdate).includes("gender") ? `${selectCore}, gender` : selectCore;
      const fallback = await supabase
        .from("users")
        .update(fallbackUpdate)
        .eq("email", tokenUser.email)
        .select(fallbackSelect)
        .single();
      data = fallback.data;
      error = fallback.error;
    } else if (!data && !error) {
      const result = await supabase
        .from("users")
        .update(updateData)
        .eq("email", tokenUser.email)
        .select(selectCore)
        .single();
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
      email: data.email,
      role: data.role,
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
    console.error("Profile update endpoint error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Refresh profile picture endpoint - updates profile picture for existing users
router.post("/profile/refresh-picture", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const { getProfilePictureUrl } = require("../utils/avatarGenerator");
    const tokenUser = req.user; // from JWT payload

    // Get user's current data from database
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("email, name, provider_id")
      .eq("email", tokenUser.email)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching user data:", fetchError);
      return res.status(500).json({
        message: "Failed to fetch user data",
        details: fetchError.message,
      });
    }

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // Since we can't get the full Google profile here, we'll use the Google API
    // to fetch the user's profile picture. However, we need the access token.
    // For now, we'll check if there's a photo_url and if not, generate initials avatar.

    // If user has a provider_id (Google ID), we can construct the photo URL
    // Google profile pictures follow this pattern: https://lh3.googleusercontent.com/a/{provider_id}
    // But the actual URL from Google OAuth is more complex, so we'll generate initials if missing

    let photoUrl = userData.photo_url || userData.avatar_url;

    // If no photo exists, generate initials-based avatar
    if (!photoUrl) {
      const { generateInitialsAvatar } = require("../utils/avatarGenerator");
      photoUrl = generateInitialsAvatar(userData.name || userData.email);
    }

    // Update the user's photo_url and avatar_url
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        photo_url: photoUrl,
        avatar_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("email", tokenUser.email)
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
