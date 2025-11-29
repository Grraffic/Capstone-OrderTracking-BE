/**
 * Admin Configuration
 *
 * This file contains the list of special admin emails that are granted
 * admin access even if they don't use the standard @laverdad.edu.ph domain.
 *
 * HOW TO ADD A NEW ADMIN EMAIL:
 * ==============================
 * 1. Add the email address (in lowercase) to the SPECIAL_ADMIN_EMAILS environment variable
 *    in your .env file (comma-separated list)
 * 2. Example: SPECIAL_ADMIN_EMAILS=email1@gmail.com,email2@gmail.com,email3@gmail.com
 * 3. The email will automatically be recognized as an admin in:
 *    - Backend authentication (passport.js)
 *    - Backend OAuth callback (auth.controller.js)
 *    - Frontend role determination (AuthContext.jsx)
 *    - Frontend login redirect (useLoginRedirect.js)
 *
 * IMPORTANT NOTES:
 * - Always use lowercase email addresses
 * - The email must be a valid Google account (for OAuth login)
 * - After adding, restart both backend and frontend servers
 * - Users with these emails will have full admin access to the system
 * - This file reads from environment variables to keep admin emails private
 *
 * @module config/admin
 */

require("dotenv").config();

/**
 * Array of special admin email addresses
 * These emails are granted admin access regardless of domain
 *
 * Reads from SPECIAL_ADMIN_EMAILS environment variable (comma-separated)
 * Falls back to empty array if not set
 *
 * @type {string[]}
 */
const SPECIAL_ADMIN_EMAILS = process.env.SPECIAL_ADMIN_EMAILS
  ? process.env.SPECIAL_ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  : [];

/**
 * Check if an email is a special admin email
 * @param {string} email - The email address to check (will be normalized to lowercase)
 * @returns {boolean} True if the email is in the special admin list
 */
const isSpecialAdmin = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }
  const normalizedEmail = email.toLowerCase().trim();
  return SPECIAL_ADMIN_EMAILS.includes(normalizedEmail);
};

/**
 * Get all special admin emails (for reference/debugging)
 * @returns {string[]} Copy of the special admin emails array
 */
const getSpecialAdminEmails = () => {
  return [...SPECIAL_ADMIN_EMAILS];
};

module.exports = {
  SPECIAL_ADMIN_EMAILS,
  isSpecialAdmin,
  getSpecialAdminEmails,
};
