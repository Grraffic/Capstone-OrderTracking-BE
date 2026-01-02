/**
 * Admin Configuration
 *
 * This file contains the list of special admin emails that are granted
 * admin access even if they don't use the standard @laverdad.edu.ph domain.
 *
 * HOW TO ADD A NEW ADMIN EMAIL:
 * ==============================
 * 1. For Property Custodian: Add the email address (in lowercase) to the SPECIAL_ADMIN_EMAILS environment variable
 *    in your .env file (comma-separated list)
 * 2. For System Admin: Add the email address (in lowercase) to the SYSTEM_ADMIN_EMAILS environment variable
 *    in your .env file (comma-separated list)
 * 3. Example: 
 *    SPECIAL_ADMIN_EMAILS=email1@gmail.com,email2@gmail.com
 *    SYSTEM_ADMIN_EMAILS=yasuor446@gmail.com
 * 4. The email will automatically be recognized in:
 *    - Backend authentication (passport.js)
 *    - Backend OAuth callback (auth.controller.js)
 *    - Frontend role determination (AuthContext.jsx)
 *    - Frontend login redirect (useLoginRedirect.js)
 *
 * IMPORTANT NOTES:
 * - Always use lowercase email addresses
 * - The email must be a valid Google account (for OAuth login)
 * - After adding, restart both backend and frontend servers
 * - Users with these emails will have appropriate access to the system
 * - This file reads from environment variables to keep admin emails private
 *
 * @module config/admin
 */

require("dotenv").config();

/**
 * Array of special property custodian email addresses
 * These emails are granted property_custodian access regardless of domain
 *
 * Reads from SPECIAL_ADMIN_EMAILS environment variable (comma-separated)
 * Falls back to empty array if not set
 *
 * @type {string[]}
 */
const SPECIAL_ADMIN_EMAILS = (process.env.SPECIAL_ADMIN_EMAILS || process.env.VITE_SPECIAL_ADMIN_EMAILS)
  ? (process.env.SPECIAL_ADMIN_EMAILS || process.env.VITE_SPECIAL_ADMIN_EMAILS).split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  : [];

/**
 * Array of system admin email addresses
 * These emails are granted system_admin access regardless of domain
 *
 * Reads from SYSTEM_ADMIN_EMAILS environment variable (comma-separated)
 * Falls back to empty array if not set
 *
 * @type {string[]}
 */
const SYSTEM_ADMIN_EMAILS = (process.env.SYSTEM_ADMIN_EMAILS || process.env.VITE_SYSTEM_ADMIN_EMAILS)
  ? (process.env.SYSTEM_ADMIN_EMAILS || process.env.VITE_SYSTEM_ADMIN_EMAILS).split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  : [];

console.log("Loaded Special Property Custodian Emails:", SPECIAL_ADMIN_EMAILS);
console.log("Loaded System Admin Emails:", SYSTEM_ADMIN_EMAILS);

/**
 * Check if an email is a special property custodian email
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
 * Check if an email is a system admin email
 * @param {string} email - The email address to check (will be normalized to lowercase)
 * @returns {boolean} True if the email is in the system admin list
 */
const isSystemAdmin = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }
  const normalizedEmail = email.toLowerCase().trim();
  return SYSTEM_ADMIN_EMAILS.includes(normalizedEmail);
};

/**
 * Get all special admin emails (for reference/debugging)
 * @returns {string[]} Copy of the special admin emails array
 */
const getSpecialAdminEmails = () => {
  return [...SPECIAL_ADMIN_EMAILS];
};

/**
 * Get all system admin emails (for reference/debugging)
 * @returns {string[]} Copy of the system admin emails array
 */
const getSystemAdminEmails = () => {
  return [...SYSTEM_ADMIN_EMAILS];
};

module.exports = {
  SPECIAL_ADMIN_EMAILS,
  SYSTEM_ADMIN_EMAILS,
  isSpecialAdmin,
  isSystemAdmin,
  getSpecialAdminEmails,
  getSystemAdminEmails,
};
