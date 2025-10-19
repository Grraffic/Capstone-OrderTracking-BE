const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact.controller");
const authRoutes = require("./auth");

// Contact routes
router.post("/contact", contactController.createContact);
router.get("/contact", contactController.getContacts);
router.get("/contact/:id", contactController.getContactById);
router.put("/contact/:id", contactController.updateContact);
router.delete("/contact/:id", contactController.deleteContact);

// Auth (Google OAuth)
router.use("/auth", authRoutes);

module.exports = router;
