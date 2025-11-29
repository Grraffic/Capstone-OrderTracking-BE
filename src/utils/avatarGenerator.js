/**
 * Avatar Generator Utility
 * 
 * Provides functions to generate avatar URLs, including initials-based avatars
 * for users who don't have profile pictures
 */

/**
 * Generate initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (e.g., "John Doe" -> "JD")
 */
function getInitials(name) {
  if (!name || typeof name !== "string") {
    return "U"; // Default to "U" for Unknown
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    // Single name - use first two letters
    return parts[0].substring(0, 2).toUpperCase();
  }

  // Multiple names - use first letter of first and last name
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstInitial}${lastInitial}`;
}

/**
 * Generate an initials-based avatar URL using UI Avatars service
 * @param {string} name - User's full name
 * @param {number} size - Avatar size in pixels (default: 200)
 * @returns {string} Avatar URL
 */
function generateInitialsAvatar(name, size = 200) {
  const initials = getInitials(name);
  // Use UI Avatars service to generate avatar with initials
  // Format: https://ui-avatars.com/api/?name=JD&size=200&background=random&color=fff&bold=true
  const encodedName = encodeURIComponent(initials);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=${size}&background=random&color=fff&bold=true&format=png`;
}

/**
 * Get profile picture URL from Google profile or generate initials avatar
 * @param {Object} profile - Google OAuth profile object
 * @param {string} fallbackName - Name to use for initials if no photo
 * @returns {string} Profile picture URL
 */
function getProfilePictureUrl(profile, fallbackName = "User") {
  // Try multiple ways to get photo from Google profile
  // Google OAuth profile can have photos in different formats
  let googlePhoto = null;
  
  // Debug: Log the entire profile structure to understand what we're working with
  console.log("=== Google Profile Photo Extraction Debug ===");
  console.log("Profile keys:", Object.keys(profile));
  console.log("Profile.photos:", profile.photos);
  console.log("Profile.photos type:", typeof profile.photos);
  console.log("Profile.photos is array:", Array.isArray(profile.photos));
  
  // Method 1: Standard photos array (most common for Google OAuth)
  if (profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0) {
    const firstPhoto = profile.photos[0];
    console.log("First photo object:", firstPhoto);
    googlePhoto = firstPhoto.value || firstPhoto.url || firstPhoto;
    if (googlePhoto && typeof googlePhoto === 'string') {
      console.log("Found photo via photos array:", googlePhoto);
    }
  }
  
  // Method 2: Direct photo property (some OAuth providers)
  if (!googlePhoto && profile.photo) {
    googlePhoto = profile.photo;
    console.log("Found photo via profile.photo:", googlePhoto);
  }
  
  // Method 3: Picture property
  if (!googlePhoto && profile.picture) {
    googlePhoto = profile.picture;
    console.log("Found photo via profile.picture:", googlePhoto);
  }
  
  // Method 4: Image property
  if (!googlePhoto && profile.image) {
    googlePhoto = profile.image.url || profile.image;
    console.log("Found photo via profile.image:", googlePhoto);
  }
  
  // Method 5: Check _json property (some passport strategies store raw data here)
  if (!googlePhoto && profile._json) {
    if (profile._json.picture) {
      googlePhoto = profile._json.picture;
      console.log("Found photo via profile._json.picture:", googlePhoto);
    } else if (profile._json.photos && Array.isArray(profile._json.photos) && profile._json.photos.length > 0) {
      googlePhoto = profile._json.photos[0].value || profile._json.photos[0].url;
      console.log("Found photo via profile._json.photos:", googlePhoto);
    }
  }

  if (googlePhoto && typeof googlePhoto === 'string' && googlePhoto.length > 0) {
    console.log("✅ Successfully extracted Google profile photo:", googlePhoto);
    return googlePhoto;
  }

  // Fallback to initials-based avatar
  const name = profile.displayName || profile.name?.givenName || profile.name?.displayName || fallbackName;
  console.log("❌ No Google photo found, generating initials avatar for:", name);
  const initialsAvatar = generateInitialsAvatar(name);
  console.log("Generated initials avatar URL:", initialsAvatar);
  return initialsAvatar;
}

module.exports = {
  getInitials,
  generateInitialsAvatar,
  getProfilePictureUrl,
};

