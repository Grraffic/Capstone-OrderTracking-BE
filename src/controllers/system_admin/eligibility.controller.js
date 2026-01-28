const eligibilityService = require("../../services/system_admin/eligibility.service");

/**
 * Eligibility Controller
 *
 * Handles HTTP requests for eligibility management
 */

/**
 * Get all items with eligibility data
 * GET /api/system-admin/eligibility
 */
exports.getEligibilityData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const filter = req.query.filter === "without_eligibility" ? "without_eligibility" : "all";

    const result = await eligibilityService.getEligibilityData({
      page,
      limit,
      search,
      filter,
    });

    res.json(result);
  } catch (error) {
    console.error("Get eligibility data error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch eligibility data",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Update eligibility for a single item
 * PUT /api/system-admin/eligibility/:itemId
 */
exports.updateItemEligibility = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { educationLevels } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    if (!Array.isArray(educationLevels)) {
      return res.status(400).json({
        success: false,
        message: "educationLevels must be an array",
      });
    }

    const result = await eligibilityService.updateItemEligibility(
      itemId,
      educationLevels
    );

    res.json(result);
  } catch (error) {
    console.error("Update item eligibility error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update item eligibility",
    });
  }
};

/**
 * Bulk update eligibility for multiple items
 * PUT /api/system-admin/eligibility/bulk
 */
exports.bulkUpdateEligibility = async (req, res) => {
  try {
    // IMMEDIATE LOG - This should appear first
    console.log("\n\n==========================================");
    console.log("=== BULK UPDATE ELIGIBILITY CALLED ===");
    console.log("==========================================\n");
    
    // Log raw request body before any processing
    console.log("Raw req.body:", JSON.stringify(req.body, null, 2));
    console.log("req.body type:", typeof req.body);
    console.log("req.body keys:", Object.keys(req.body || {}));
    
    const { updates } = req.body;

    console.log("Extracted updates:", updates);
    console.log("Updates type:", typeof updates);
    console.log("Updates isArray:", Array.isArray(updates));
    if (updates && updates.length > 0) {
      console.log("First update:", JSON.stringify(updates[0], null, 2));
      console.log("First update educationLevels:", updates[0].educationLevels);
      console.log("First update educationLevels type:", typeof updates[0].educationLevels);
      console.log("First update educationLevels isArray:", Array.isArray(updates[0].educationLevels));
      console.log("First update educationLevels constructor:", updates[0].educationLevels?.constructor?.name);
    }

    if (!updates) {
      return res.status(400).json({
        success: false,
        message: "updates field is required",
      });
    }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: "updates must be an array",
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "updates array cannot be empty",
      });
    }

    // Validate each update object
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      if (!update || typeof update !== "object") {
        return res.status(400).json({
          success: false,
          message: `Update at index ${i} must be an object`,
        });
      }
      if (!update.itemId) {
        return res.status(400).json({
          success: false,
          message: `Update at index ${i} is missing itemId`,
        });
      }
      if (update.educationLevels === undefined || update.educationLevels === null) {
        return res.status(400).json({
          success: false,
          message: `Update at index ${i} is missing educationLevels field`,
        });
      }

      // Log the educationLevels value before validation
      console.log(`Validating update ${i} - educationLevels:`, {
        value: update.educationLevels,
        type: typeof update.educationLevels,
        isArray: Array.isArray(update.educationLevels),
        constructor: update.educationLevels?.constructor?.name,
      });

      // Check if it's a string that might be a JSON array
      if (typeof update.educationLevels === 'string') {
        try {
          const parsed = JSON.parse(update.educationLevels);
          if (Array.isArray(parsed)) {
            update.educationLevels = parsed; // Normalize it
            console.log(`Normalized educationLevels for update ${i} from string to array`);
          } else {
            return res.status(400).json({
              success: false,
              message: `Update at index ${i} must have educationLevels as an array`,
            });
          }
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: `Update at index ${i} must have educationLevels as an array`,
          });
        }
      }

      if (!Array.isArray(update.educationLevels)) {
        return res.status(400).json({
          success: false,
          message: `Update at index ${i} must have educationLevels as an array, got ${typeof update.educationLevels}`,
        });
      }
    }

    console.log("Calling bulkUpdateEligibility service with:", updates.length, "updates");
    console.log("Updates being passed to service:", JSON.stringify(updates, null, 2));
    
    // Deep clone and ensure proper array structure
    // Create clean deep clone to ensure arrays are preserved through JSON round-trip
    const cleanUpdates = updates.map(update => ({
      itemId: String(update.itemId), // Ensure string
      educationLevels: Array.isArray(update.educationLevels) 
        ? [...update.educationLevels] // Create new array copy
        : [] // Fallback to empty array
    }));
    
    console.log("Clean updates after deep clone:", JSON.stringify(cleanUpdates, null, 2));
    
    // Verify before passing to service - ensure all educationLevels are arrays
    for (let i = 0; i < cleanUpdates.length; i++) {
      const update = cleanUpdates[i];
      if (!Array.isArray(update.educationLevels)) {
        console.error(`FATAL: Update ${i} educationLevels is still not an array after processing!`);
        return res.status(500).json({
          success: false,
          message: `Internal server error: Failed to process educationLevels for update ${i}`,
          details: {
            index: i,
            itemId: update.itemId,
            educationLevels: update.educationLevels,
            type: typeof update.educationLevels,
          }
        });
      }
    }
    
    const result = await eligibilityService.bulkUpdateEligibility(cleanUpdates);
    console.log("bulkUpdateEligibility service returned:", JSON.stringify(result, null, 2));

    // If all updates failed, return 400 with error details
    if (!result.success && result.errors && result.errors.length > 0 && result.data.length === 0) {
      console.error("All updates failed. Errors:", result.errors);
      console.error("Error message:", result.message);
      return res.status(400).json({
        success: false,
        message: result.message || result.errors[0]?.error || "All updates failed",
        errors: result.errors,
        details: "All eligibility updates failed. Check errors array for details.",
      });
    }

    // If there were errors but some succeeded, return partial success (207 Multi-Status)
    if (result.errors && result.errors.length > 0) {
      return res.status(207).json({
        success: result.success,
        data: result.data,
        errors: result.errors,
        message: `${result.errors.length} update(s) failed`,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Bulk update eligibility error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    // Check if it's a validation error (400) or server error (500)
    const isValidationError = error.message && error.message.includes("must be");
    const statusCode = isValidationError ? 400 : 500;
    console.error(`Returning ${statusCode} error:`, error.message);
    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to bulk update eligibility",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Remove duplicate eligibility entries for items with same name but different sizes
 * POST /api/system-admin/eligibility/remove-duplicates
 */
exports.removeDuplicateEligibility = async (req, res) => {
  try {
    console.log("🧹 Remove duplicate eligibility endpoint called");
    
    const result = await eligibilityService.removeDuplicateEligibility();

    res.json(result);
  } catch (error) {
    console.error("Remove duplicate eligibility error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove duplicate eligibility",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Backfill eligibility for all existing items that don't have eligibility entries
 * POST /api/system-admin/eligibility/backfill
 */
exports.backfillEligibility = async (req, res) => {
  try {
    console.log("🔄 Backfill eligibility endpoint called");
    
    const result = await eligibilityService.backfillEligibilityForAllItems();

    res.json(result);
  } catch (error) {
    console.error("Backfill eligibility error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to backfill eligibility",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Delete an item (soft delete)
 * DELETE /api/system-admin/eligibility/:itemId
 */
exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    const result = await eligibilityService.deleteItem(itemId);

    res.json(result);
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete item",
    });
  }
};
