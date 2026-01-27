const express = require("express");
const router = express.Router();
const eligibilityController = require("../../controllers/system_admin/eligibility.controller");
const { verifyToken, requireSystemAdmin } = require("../../middleware/auth");

// All routes require authentication and system admin role
router.use(verifyToken);
router.use(requireSystemAdmin);

// Get all items with eligibility data (with pagination and search)
router.get("/", eligibilityController.getEligibilityData);

// Bulk update eligibility for multiple items (MUST come before /:itemId route)
router.put("/bulk", eligibilityController.bulkUpdateEligibility);

// Remove duplicate eligibility entries (MUST come before /:itemId route)
router.post("/remove-duplicates", eligibilityController.removeDuplicateEligibility);

// Backfill eligibility for all existing items (MUST come before /:itemId route)
router.post("/backfill", eligibilityController.backfillEligibility);

// Update eligibility for a single item
router.put("/:itemId", eligibilityController.updateItemEligibility);

// Diagnostic test endpoint to verify Express JSON parsing
router.post("/test", (req, res) => {
  console.log("=== TEST ENDPOINT ===");
  console.log("req.body:", JSON.stringify(req.body, null, 2));
  console.log("req.body.updates:", req.body.updates);
  console.log("First update educationLevels:", req.body.updates?.[0]?.educationLevels);
  console.log("Is Array:", Array.isArray(req.body.updates?.[0]?.educationLevels));
  res.json({ 
    received: req.body,
    analysis: {
      bodyType: typeof req.body,
      hasUpdates: !!req.body.updates,
      updatesIsArray: Array.isArray(req.body.updates),
      firstUpdateEducationLevelsType: req.body.updates?.[0]?.educationLevels ? typeof req.body.updates[0].educationLevels : 'N/A',
      firstUpdateEducationLevelsIsArray: Array.isArray(req.body.updates?.[0]?.educationLevels),
    }
  });
});

// Delete an item (soft delete)
router.delete("/:itemId", eligibilityController.deleteItem);

module.exports = router;
