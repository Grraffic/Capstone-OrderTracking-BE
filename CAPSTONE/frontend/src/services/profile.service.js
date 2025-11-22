import api from "./api";

/**
 * Profile Service
 *
 * Handles all profile-related API calls including:
 * - Fetching profile data
 * - Updating profile information
 * - Uploading profile images via backend
 */
class ProfileService {
  /**
   * Get current user profile
   * @returns {Promise<Object>} Profile data
   */
  async getProfile() {
    try {
      const response = await api.get("/auth/profile");
      return response.data;
    } catch (error) {
      console.error("Get profile error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch profile"
      );
    }
  }

  /**
   * Update user profile
   * @param {Object} data - Profile data to update
   * @param {string} data.name - User's full name
   * @param {string} data.photoURL - Profile image URL
   * @returns {Promise<Object>} Updated profile data
   */
  async updateProfile(data) {
    try {
      const response = await api.put("/auth/profile", data);
      return response.data;
    } catch (error) {
      console.error("Update profile error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  }

  /**
   * Upload profile image to Cloudinary via backend
   * @param {File} file - Image file to upload
   * @returns {Promise<string>} Cloudinary URL of uploaded image
   */
  async uploadProfileImage(file) {
    try {
      // Validate file
      if (!file) {
        throw new Error("No file provided");
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        throw new Error(
          "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image."
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error(
          "File size exceeds 5MB. Please upload a smaller image."
        );
      }

      console.log("📤 Uploading profile image to Cloudinary...");
      console.log(
        `📁 File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
      );

      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      // Send to backend (which uploads to Cloudinary)
      const response = await api.post("/auth/profile/upload-image", {
        image: base64,
        fileName: file.name,
      });

      console.log("✅ Profile image uploaded successfully");
      console.log(`🔗 Cloudinary URL: ${response.data.imageUrl}`);

      // Return Cloudinary URL
      return response.data.imageUrl;
    } catch (error) {
      console.error("❌ Upload profile image error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to upload profile image";

      if (error.message && !error.response) {
        // Client-side validation error
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        // Server error with message
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 413) {
        errorMessage =
          "Image file is too large. Please upload a smaller image.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Convert file to base64
   * @param {File} file - File to convert
   * @returns {Promise<string>} Base64 string
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const profileService = new ProfileService();
