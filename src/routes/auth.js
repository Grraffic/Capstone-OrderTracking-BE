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

// Profile endpoint - returns user info from token
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const tokenUser = req.user; // from JWT payload
    // Try to fetch user details from users table for richer profile
    const { data, error } = await supabase
      .from("users")
      .select(
        "email, name, role, avatar_url, photo_url, course_year_level, student_number, education_level"
      )
      .eq("email", tokenUser.email)
      .maybeSingle();

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

    const profile = {
      id: tokenUser.id,
      email: emailString,
      role: tokenUser.role,
      name: data?.name || null,
      photoURL: data?.photo_url || data?.avatar_url || null,
      courseYearLevel: data?.course_year_level || null,
      studentNumber: data?.student_number || null,
      educationLevel: data?.education_level || null,
    };

    // Debug logging to verify photo URL is being returned
    console.log("📸 Profile endpoint - Returning profile data:");
    console.log("  - photo_url from DB:", data?.photo_url);
    console.log("  - avatar_url from DB:", data?.avatar_url);
    console.log("  - photoURL in response:", profile.photoURL);

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

// Update profile endpoint - updates user profile information
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const tokenUser = req.user; // from JWT payload
    const { name, photoURL, courseYearLevel, studentNumber, educationLevel } =
      req.body;

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    // Add name if provided (for admin updates)
    if (name && typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    // Add photo URL if provided
    if (photoURL) {
      updateData.photo_url = photoURL;
      updateData.avatar_url = photoURL; // Keep both fields in sync
    }

    // Add student-specific fields if provided
    if (courseYearLevel !== undefined) {
      updateData.course_year_level = courseYearLevel;
    }

    if (studentNumber !== undefined) {
      updateData.student_number = studentNumber;
    }

    if (educationLevel !== undefined) {
      updateData.education_level = educationLevel;
    }

    // Update user in database
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("email", tokenUser.email)
      .select(
        "email, name, role, avatar_url, photo_url, course_year_level, student_number, education_level"
      )
      .single();

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

    // Return updated profile
    const profile = {
      id: tokenUser.id,
      email: data.email,
      role: data.role,
      name: data.name,
      photoURL: data.photo_url || data.avatar_url,
      courseYearLevel: data.course_year_level,
      studentNumber: data.student_number,
      educationLevel: data.education_level,
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
