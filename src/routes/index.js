const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact.controller");
const authRoutes = require("./auth");
const itemsRoutes = require("./items");
const orderRoutes = require("./orders");
const cartRoutes = require("./cart");
const notificationRoutes = require("./notification");

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

module.exports = router;
