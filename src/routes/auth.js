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
      .select("email, name, role, avatar_url, photo_url")
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
    };

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

/* OLD LOCAL FILE STORAGE CODE - REPLACED WITH CLOUDINARY
// This code has been replaced with Cloudinary cloud storage
// Keeping for reference during transition period
//
// // Extract base64 data
// const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
// const buffer = Buffer.from(base64Data, "base64");
//
// // Generate unique filename
// const fileExt = fileName.split(".").pop();
// const uniqueFileName = `profile-${Date.now()}-${Math.random()
//   .toString(36)
//   .substring(7)}.${fileExt}`;
//
// // Store in backend uploads directory
// const fs = require("fs");
// const path = require("path");
// const uploadsDir = path.join(__dirname, "../../uploads/profile-images");
//
// // Create directory if it doesn't exist
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }
//
// const filePath = path.join(uploadsDir, uniqueFileName);
// fs.writeFileSync(filePath, buffer);
//
// // Return public URL
// const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
// const imageUrl = `${baseUrl}/uploads/profile-images/${uniqueFileName}`;
*/

// Update profile endpoint - updates user profile information
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const supabase = require("../config/supabase");
    const tokenUser = req.user; // from JWT payload
    const { name, photoURL } = req.body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    // Add photo URL if provided
    if (photoURL) {
      updateData.photo_url = photoURL;
      updateData.avatar_url = photoURL; // Keep both fields in sync
    }

    // Update user in database
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("email", tokenUser.email)
      .select("email, name, role, avatar_url, photo_url")
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
    };

    return res.json(profile);
  } catch (err) {
    console.error("Profile update endpoint error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Logout (stateless) - client should clear token
router.post("/logout", (req, res) => {
  // If you had server-side sessions, invalidate them here. For JWT stateless, simply respond OK.
  res.json({ message: "Logged out" });
});

module.exports = router;
