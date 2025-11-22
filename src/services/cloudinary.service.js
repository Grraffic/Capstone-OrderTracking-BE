/**
 * Cloudinary Service
 * 
 * Handles image upload and management operations with Cloudinary.
 * Provides functions for uploading profile images and cleaning up old images.
 * 
 * @module services/cloudinary
 */

const { cloudinary } = require('../config/cloudinary');

/**
 * Upload a base64 image to Cloudinary
 * 
 * @param {string} base64Image - Base64 encoded image data (with or without data URI prefix)
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder path (default: 'la-verdad-uniforms/profile-images')
 * @param {string} options.publicId - Custom public ID for the image (optional)
 * @param {number} options.width - Resize width (optional)
 * @param {number} options.height - Resize height (optional)
 * @param {string} options.crop - Crop mode (default: 'fill')
 * @param {string} options.format - Image format (default: 'auto')
 * @param {number} options.quality - Image quality 1-100 (default: 'auto')
 * @returns {Promise<Object>} Upload result with secure_url, public_id, etc.
 * @throws {Error} If upload fails
 */
const uploadImage = async (base64Image, options = {}) => {
  try {
    // Validate input
    if (!base64Image || typeof base64Image !== 'string') {
      throw new Error('Invalid image data: base64Image must be a non-empty string');
    }

    // Set default options
    const {
      folder = 'la-verdad-uniforms/profile-images',
      publicId = null,
      width = 400,
      height = 400,
      crop = 'fill',
      format = 'auto',
      quality = 'auto'
    } = options;

    // Ensure base64 string has the correct data URI prefix
    let imageData = base64Image;
    if (!imageData.startsWith('data:')) {
      // If no data URI prefix, assume it's a JPEG
      imageData = `data:image/jpeg;base64,${imageData}`;
    }

    console.log('📤 Uploading image to Cloudinary...');
    console.log(`📁 Folder: ${folder}`);
    console.log(`📏 Dimensions: ${width}x${height}`);

    // Upload configuration
    const uploadConfig = {
      folder,
      resource_type: 'image',
      transformation: [
        {
          width,
          height,
          crop,
          quality,
          fetch_format: format
        }
      ],
      // Generate unique filename if publicId not provided
      use_filename: !publicId,
      unique_filename: !publicId,
      overwrite: false
    };

    // Add public_id if provided
    if (publicId) {
      uploadConfig.public_id = publicId;
      uploadConfig.overwrite = true;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageData, uploadConfig);

    console.log('✅ Image uploaded successfully');
    console.log(`🔗 URL: ${result.secure_url}`);
    console.log(`🆔 Public ID: ${result.public_id}`);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to upload image to Cloudinary';
    
    if (error.message.includes('Invalid image')) {
      errorMessage = 'Invalid image data provided';
    } else if (error.message.includes('File size')) {
      errorMessage = 'Image file size exceeds maximum allowed size';
    } else if (error.http_code === 401) {
      errorMessage = 'Cloudinary authentication failed. Please check API credentials.';
    } else if (error.http_code === 420) {
      errorMessage = 'Cloudinary rate limit exceeded. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};

/**
 * Upload a profile image to Cloudinary
 * Convenience wrapper for uploadImage with profile-specific defaults
 * 
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} userId - User ID to use in the filename
 * @returns {Promise<Object>} Upload result with secure_url
 * @throws {Error} If upload fails
 */
const uploadProfileImage = async (base64Image, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for profile image upload');
    }

    // Generate a unique public ID for the profile image
    const timestamp = Date.now();
    const publicId = `profile-${userId}-${timestamp}`;

    console.log(`👤 Uploading profile image for user: ${userId}`);

    const result = await uploadImage(base64Image, {
      folder: 'la-verdad-uniforms/profile-images',
      publicId,
      width: 400,
      height: 400,
      crop: 'fill',
      format: 'auto',
      quality: 'auto'
    });

    return result;
  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * 
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 * @throws {Error} If deletion fails
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId || typeof publicId !== 'string') {
      throw new Error('Invalid public ID: must be a non-empty string');
    }

    console.log(`🗑️ Deleting image from Cloudinary: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });

    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully');
      return { success: true, result: result.result };
    } else if (result.result === 'not found') {
      console.log('⚠️ Image not found in Cloudinary');
      return { success: false, result: 'not_found' };
    } else {
      console.log('⚠️ Image deletion failed:', result.result);
      return { success: false, result: result.result };
    }
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * 
 * @param {string} cloudinaryUrl - Full Cloudinary URL
 * @returns {string|null} Public ID or null if URL is invalid
 */
const extractPublicId = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
      return null;
    }

    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    // or: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/v{version}/{public_id}.{format}
    
    const urlParts = cloudinaryUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) {
      return null;
    }

    // Get everything after 'upload' and before the file extension
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
    
    // Remove version (v1234567890) if present
    const withoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove transformations if present (anything before the last segment that starts with a letter)
    const segments = withoutVersion.split('/');
    const lastSegment = segments[segments.length - 1];
    
    // Remove file extension
    const publicId = lastSegment.split('.')[0];
    
    // Reconstruct full public ID with folder path
    const folderPath = segments.slice(0, -1).filter(seg => !seg.match(/^[wh]_\d+|^c_\w+|^q_\w+|^f_\w+/));
    
    if (folderPath.length > 0) {
      return `${folderPath.join('/')}/${publicId}`;
    }
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Delete old profile image when user uploads a new one
 * 
 * @param {string} oldImageUrl - URL of the old profile image
 * @returns {Promise<Object>} Deletion result
 */
const deleteOldProfileImage = async (oldImageUrl) => {
  try {
    if (!oldImageUrl) {
      console.log('ℹ️ No old image URL provided, skipping deletion');
      return { success: true, skipped: true };
    }

    // Only delete if it's a Cloudinary URL
    if (!oldImageUrl.includes('cloudinary.com')) {
      console.log('ℹ️ Old image is not from Cloudinary, skipping deletion');
      return { success: true, skipped: true };
    }

    const publicId = extractPublicId(oldImageUrl);
    
    if (!publicId) {
      console.log('⚠️ Could not extract public ID from URL, skipping deletion');
      return { success: false, error: 'invalid_url' };
    }

    return await deleteImage(publicId);
  } catch (error) {
    console.error('❌ Error deleting old profile image:', error);
    // Don't throw error - deletion failure shouldn't block new upload
    return { success: false, error: error.message };
  }
};

module.exports = {
  uploadImage,
  uploadProfileImage,
  deleteImage,
  deleteOldProfileImage,
  extractPublicId
};

