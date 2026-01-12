const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact.controller");
const authRoutes = require("./auth");
const itemsRoutes = require("./property_custodian/items");
const orderRoutes = require("./property_custodian/orders");
const cartRoutes = require("./cart");
const notificationRoutes = require("./notification");
const transactionRoutes = require("./transaction");
const userRoutes = require("./system_admin/users");
const emailRoleAssignmentRoutes = require("./system_admin/emailRoleAssignments");

// Contact routes
router.post("/contact", contactController.createContact);
router.get("/contact", contactController.getContacts);
router.get("/contact/:id", contactController.getContactById);
router.put("/contact/:id", contactController.updateContact);
router.delete("/contact/:id", contactController.deleteContact);

// Auth (Google OAuth)
router.use("/auth", authRoutes);

// Items routes (Admin only)
router.use("/items", itemsRoutes);

// Order routes
router.use("/orders", orderRoutes);

// Cart routes (Student only)
router.use("/cart", cartRoutes);

// Notification routes
router.use("/notifications", notificationRoutes);

// Transaction routes (Property Custodian only)
router.use("/transactions", transactionRoutes);

// User management routes (System Admin only)
router.use("/users", userRoutes);

// Email role assignment routes (System Admin only)
router.use("/system-admin/email-role-assignments", emailRoleAssignmentRoutes);

module.exports = router;
