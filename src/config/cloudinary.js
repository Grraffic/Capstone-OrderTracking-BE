/**
 * Cloudinary Configuration
 * 
 * Configures Cloudinary SDK for cloud-based image storage and delivery.
 * Used for storing user profile images with CDN delivery.
 * 
 * Required Environment Variables:
 * - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Your Cloudinary API key
 * - CLOUDINARY_API_SECRET: Your Cloudinary API secret
 * 
 * @module config/cloudinary
 */

const cloudinary = require('cloudinary').v2;

/**
 * Validate that all required Cloudinary environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
const validateCloudinaryConfig = () => {
  const requiredVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Cloudinary environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure these are set in your .env file or environment configuration.'
    );
  }
};

/**
 * Initialize Cloudinary configuration
 */
const initializeCloudinary = () => {
  try {
    // Validate environment variables first
    validateCloudinaryConfig();

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true // Always use HTTPS
    });

    console.log('✅ Cloudinary configured successfully');
    console.log(`📦 Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  } catch (error) {
    console.error('❌ Cloudinary configuration failed:', error.message);
    throw error;
  }
};

// Initialize Cloudinary on module load
initializeCloudinary();

/**
 * Get Cloudinary configuration status
 * @returns {Object} Configuration status information
 */
const getConfigStatus = () => {
  return {
    configured: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'
  };
};

module.exports = {
  cloudinary,
  getConfigStatus,
  validateCloudinaryConfig
};

