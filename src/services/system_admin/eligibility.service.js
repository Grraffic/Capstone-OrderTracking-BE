const supabase = require("../../config/supabase");

/**
 * Eligibility Service
 *
 * Handles all database operations for item eligibility management
 * Supports many-to-many relationship between items and education levels
 */

/**
 * Backfill eligibility for all existing items that don't have eligibility entries
 * This ensures all items are visible to students in the correct education level
 * @returns {Promise<Object>} Backfill results
 */
async function backfillEligibilityForAllItems() {
  try {
    console.log("🔄 Starting eligibility backfill for all items...");

    // Get all active items
    const { data: allItems, error: itemsError } = await supabase
      .from("items")
      .select("id, name, education_level")
      .eq("is_active", true);

    if (itemsError) throw itemsError;

    console.log(`Found ${allItems.length} active items to process`);

    const educationLevelMap = {
      "Kindergarten": "Kindergarten",
      "Elementary": "Elementary",
      "Junior High School": "Junior High School",
      "Senior High School": "Senior High School",
      "College": "College",
    };

    let created = 0;
    let skipped = 0;
    let errors = [];

    // Check if item_eligibility table exists
    const { error: tableCheck } = await supabase
      .from("item_eligibility")
      .select("id")
      .limit(1);

    if (tableCheck && tableCheck.code === '42P01') {
      return {
        success: false,
        message: "item_eligibility table does not exist. Please run the migration first.",
      };
    }

    // Process each item
    for (const item of allItems) {
      try {
        if (!item.education_level) {
          console.warn(`Item ${item.id} (${item.name}) has no education_level, skipping`);
          skipped++;
          continue;
        }

        const eligibilityLevel = educationLevelMap[item.education_level] || item.education_level;

        // Check if eligibility entry already exists
        const { data: existingEligibility, error: checkError } = await supabase
          .from("item_eligibility")
          .select("id")
          .eq("item_id", item.id)
          .eq("education_level", eligibilityLevel)
          .maybeSingle();

        if (checkError) {
          console.warn(`Error checking eligibility for item ${item.id}:`, checkError.message);
          errors.push({
            itemId: item.id,
            itemName: item.name,
            error: checkError.message,
          });
          continue;
        }

        if (existingEligibility) {
          // Eligibility already exists, skip
          skipped++;
          continue;
        }

        // Create eligibility entry
        const { error: insertError } = await supabase
          .from("item_eligibility")
          .insert({
            item_id: item.id,
            education_level: eligibilityLevel,
          });

        if (insertError) {
          console.warn(`Failed to create eligibility for item ${item.id}:`, insertError.message);
          errors.push({
            itemId: item.id,
            itemName: item.name,
            error: insertError.message,
          });
        } else {
          created++;
          console.log(`✅ Created eligibility for "${item.name}" (${eligibilityLevel})`);
        }
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error.message);
        errors.push({
          itemId: item.id,
          itemName: item.name,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Backfilled eligibility for ${created} items`,
      stats: {
        totalItems: allItems.length,
        eligibilityCreated: created,
        alreadyExists: skipped,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Backfill eligibility error:", error);
    throw new Error(`Failed to backfill eligibility: ${error.message}`);
  }
}

/**
 * Get all items with their eligibility status for each education level
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} options.search - Search term for item name
 * @returns {Promise<Object>} Items data with eligibility info and pagination
 */
async function getEligibilityData({
  page = 1,
  limit = 10,
  search = "",
} = {}) {
  try {
    // Check if item_eligibility table exists
    const { error: tableCheck } = await supabase
      .from("item_eligibility")
      .select("id")
      .limit(1);

    if (tableCheck && tableCheck.code === '42P01') {
      console.error("❌ item_eligibility table does not exist!");
      throw new Error("item_eligibility table not found. Please run migration.");
    } else if (tableCheck) {
      console.warn("⚠️ item_eligibility table check warning:", tableCheck.message);
    } else {
      console.log("✅ item_eligibility table exists and is accessible");
    }

    // Build query for items - group by name to show unique items only
    let itemsQuery = supabase
      .from("items")
      .select("id, name", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true });

    // Apply search filter
    if (search && search.trim() !== "") {
      itemsQuery = itemsQuery.ilike("name", `%${search.trim()}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    itemsQuery = itemsQuery.range(from, from + limit - 1);

    const { data: items, error: itemsError, count } = await itemsQuery;

    if (itemsError) throw itemsError;

    // Handle case where no items are found
    if (!items || items.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    }

    // Get unique item names (normalize by removing size variations)
    // Group items by base name (same name = same item, different sizes)
    const itemNameMap = new Map();
    items.forEach((item) => {
      const baseName = item.name.trim();
      if (!itemNameMap.has(baseName)) {
        itemNameMap.set(baseName, []);
      }
      itemNameMap.get(baseName).push(item.id);
    });

    // Get all item IDs for the fetched items
    const allItemIds = items.map((item) => item.id);
    
    // Get all eligibility records for these items
    let eligibilityRecords = [];
    if (allItemIds.length > 0) {
      let eligibilityQuery = supabase
        .from("item_eligibility")
        .select("item_id, education_level")
        .in("item_id", allItemIds);

      const { data, error: eligibilityError } = await eligibilityQuery;

      if (eligibilityError) {
        console.warn("Eligibility query error (table may not exist yet):", eligibilityError.message);
        eligibilityRecords = [];
      } else {
        eligibilityRecords = data || [];
      }
    }

    // For each unique item name, consolidate eligibility from all size variations
    const itemsWithEligibility = [];
    
    for (const [itemName, itemIds] of itemNameMap.entries()) {
      // Get all eligibility levels for all size variations of this item
      const eligibleLevelsSet = new Set();
      itemIds.forEach((itemId) => {
        const itemEligibility = eligibilityRecords.filter(
          (record) => record.item_id === itemId
        );
        itemEligibility.forEach((record) => {
          eligibleLevelsSet.add(record.education_level);
        });
      });

      const eligibleLevels = Array.from(eligibleLevelsSet);

      // Use the first item ID as the representative ID for display
      itemsWithEligibility.push({
        id: itemIds[0], // Use first item ID as representative
        name: itemName,
        itemIds: itemIds, // Store all item IDs for this name
        isPreschoolEligible: eligibleLevels.includes("Kindergarten"),
        isElementaryEligible: eligibleLevels.includes("Elementary"),
        isJHSEligible: eligibleLevels.includes("Junior High School"),
        isSHSEligible: eligibleLevels.includes("Senior High School"),
        isCollegeEligible: eligibleLevels.includes("College"),
        eligibleLevels: eligibleLevels,
      });
    }

    return {
      success: true,
      data: itemsWithEligibility,
      pagination: {
        total: itemNameMap.size, // Count unique item names
        page,
        limit,
        totalPages: Math.ceil(itemNameMap.size / limit),
      },
    };
  } catch (error) {
    console.error("Get eligibility data error:", error);
    throw new Error(`Failed to fetch eligibility data: ${error.message}`);
  }
}

/**
 * Update eligibility for a single item (and all its size variations)
 * @param {string} itemId - Item UUID (can be any size variation)
 * @param {Array<string>} educationLevels - Array of education levels (e.g., ["Kindergarten", "Elementary"])
 * @returns {Promise<Object>} Updated eligibility data
 */
async function updateItemEligibility(itemId, educationLevels) {
  try {
    // Log what we receive
    console.log(`updateItemEligibility called with:`, {
      itemId,
      educationLevels,
      type: typeof educationLevels,
      isArray: Array.isArray(educationLevels),
      constructor: educationLevels?.constructor?.name,
    });

    // Handle case where educationLevels might be a string
    if (typeof educationLevels === 'string') {
      try {
        educationLevels = JSON.parse(educationLevels);
        console.log(`Parsed educationLevels from string:`, educationLevels);
      } catch (e) {
        console.error(`Failed to parse educationLevels string:`, e);
        throw new Error("educationLevels must be an array");
      }
    }

    // Validate that educationLevels is an array
    if (!Array.isArray(educationLevels)) {
      console.error(`Invalid educationLevels received:`, {
        value: educationLevels,
        type: typeof educationLevels,
        isArray: Array.isArray(educationLevels),
        constructor: educationLevels?.constructor?.name,
      });
      throw new Error(`educationLevels must be an array, got ${typeof educationLevels}`);
    }

    // Validate education levels
    const validLevels = [
      "Kindergarten",
      "Elementary",
      "Junior High School",
      "Senior High School",
      "College",
    ];
    const normalizedLevels = educationLevels.filter((level) =>
      validLevels.includes(level)
    );

    // Get the item to find its name
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("name")
      .eq("id", itemId)
      .single();

    if (itemError) throw itemError;
    if (!item) throw new Error("Item not found");

    // Find all items with the same name (all size variations)
    const { data: sameNameItems, error: sameNameError } = await supabase
      .from("items")
      .select("id")
      .eq("name", item.name.trim())
      .eq("is_active", true);

    if (sameNameError) throw sameNameError;

    const allItemIds = sameNameItems.map((i) => i.id);

    console.log(`Found ${allItemIds.length} items with name "${item.name}" - updating all size variations`);

    // Update eligibility for ALL size variations of this item
    for (const id of allItemIds) {
      // Delete existing eligibility records for this item
      const { error: deleteError } = await supabase
        .from("item_eligibility")
        .delete()
        .eq("item_id", id);

      if (deleteError) throw deleteError;

      // Insert new eligibility records
      if (normalizedLevels.length > 0) {
        const recordsToInsert = normalizedLevels.map((level) => ({
          item_id: id,
          education_level: level,
        }));

        const { error: insertError } = await supabase
          .from("item_eligibility")
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }
    }

    // Fetch updated eligibility (from the original item)
    const { data: updatedRecords, error: fetchError } = await supabase
      .from("item_eligibility")
      .select("education_level")
      .eq("item_id", itemId);

    if (fetchError) throw fetchError;

    return {
      success: true,
      data: {
        itemId,
        itemName: item.name,
        itemsUpdated: allItemIds.length,
        eligibleLevels: updatedRecords.map((r) => r.education_level),
      },
    };
  } catch (error) {
    console.error("Update item eligibility error:", error);
    throw new Error(`Failed to update item eligibility: ${error.message}`);
  }
}

/**
 * Remove duplicate eligibility entries for items with same name but different sizes
 * Consolidates eligibility so all size variations share the same eligibility
 * @returns {Promise<Object>} Cleanup results
 */
async function removeDuplicateEligibility() {
  try {
    console.log("🧹 Starting duplicate eligibility cleanup...");

    // Get all active items
    const { data: allItems, error: itemsError } = await supabase
      .from("items")
      .select("id, name")
      .eq("is_active", true);

    if (itemsError) throw itemsError;

    // Group items by name (same name = same item, different sizes)
    const itemsByName = new Map();
    allItems.forEach((item) => {
      const baseName = item.name.trim();
      if (!itemsByName.has(baseName)) {
        itemsByName.set(baseName, []);
      }
      itemsByName.get(baseName).push(item.id);
    });

    console.log(`Found ${itemsByName.size} unique item names with ${allItems.length} total items`);

    let consolidated = 0;
    let duplicatesRemoved = 0;
    const errors = [];

    // Process each item name group
    for (const [itemName, itemIds] of itemsByName.entries()) {
      if (itemIds.length <= 1) {
        // Only one item with this name, no duplicates to remove
        continue;
      }

      try {
        // Get all eligibility records for all size variations
        const { data: allEligibility, error: eligibilityError } = await supabase
          .from("item_eligibility")
          .select("item_id, education_level")
          .in("item_id", itemIds);

        if (eligibilityError) {
          console.warn(`Error fetching eligibility for "${itemName}":`, eligibilityError.message);
          continue;
        }

        if (!allEligibility || allEligibility.length === 0) {
          // No eligibility records for this item group
          continue;
        }

        // Get unique education levels across all size variations
        const uniqueLevels = new Set();
        allEligibility.forEach((record) => {
          uniqueLevels.add(record.education_level);
        });

        const consolidatedLevels = Array.from(uniqueLevels);

        // Count duplicates (records beyond the first item)
        const firstItemId = itemIds[0];
        const duplicateRecords = allEligibility.filter(
          (record) => record.item_id !== firstItemId
        );
        duplicatesRemoved += duplicateRecords.length;

        // Update all size variations to have the same eligibility
        for (const itemId of itemIds) {
          // Delete existing eligibility
          const { error: deleteError } = await supabase
            .from("item_eligibility")
            .delete()
            .eq("item_id", itemId);

          if (deleteError) {
            console.warn(`Error deleting eligibility for item ${itemId}:`, deleteError.message);
            continue;
          }

          // Insert consolidated eligibility
          if (consolidatedLevels.length > 0) {
            const recordsToInsert = consolidatedLevels.map((level) => ({
              item_id: itemId,
              education_level: level,
            }));

            const { error: insertError } = await supabase
              .from("item_eligibility")
              .insert(recordsToInsert);

            if (insertError) {
              console.warn(`Error inserting eligibility for item ${itemId}:`, insertError.message);
              errors.push({
                itemName,
                itemId,
                error: insertError.message,
              });
            }
          }
        }

        consolidated++;
        console.log(`✅ Consolidated eligibility for "${itemName}" (${itemIds.length} size variations)`);
      } catch (error) {
        console.error(`Error processing "${itemName}":`, error.message);
        errors.push({
          itemName,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Consolidated eligibility for ${consolidated} item groups`,
      stats: {
        uniqueItemNames: itemsByName.size,
        totalItems: allItems.length,
        itemGroupsConsolidated: consolidated,
        duplicateRecordsRemoved: duplicatesRemoved,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Remove duplicate eligibility error:", error);
    throw new Error(`Failed to remove duplicate eligibility: ${error.message}`);
  }
}

/**
 * Bulk update eligibility for multiple items
 * @param {Array<Object>} updates - Array of {itemId, educationLevels} objects
 * @returns {Promise<Object>} Bulk update results
 */
async function bulkUpdateEligibility(updates) {
  try {
    // Verify database connection and table existence
    const { error: connError } = await supabase
      .from("item_eligibility")
      .select("id")
      .limit(1);

    if (connError) {
      console.error("❌ Database connection issue:", connError);
      // Check if it's a table not found error
      if (connError.code === 'PGRST205' || connError.message?.includes('Could not find the table')) {
        throw new Error(`The item_eligibility table does not exist. Please run the migration: backend/RUN_ELIGIBILITY_MIGRATION.sql in your Supabase SQL Editor.`);
      }
      throw new Error(`Database connection failed: ${connError.message}`);
    }
    console.log("✅ Database connection verified - item_eligibility table exists");

    console.log("bulkUpdateEligibility service - received updates:", JSON.stringify(updates, null, 2));
    console.log("bulkUpdateEligibility service - updates type:", typeof updates);
    console.log("bulkUpdateEligibility service - updates isArray:", Array.isArray(updates));
    
    // Ensure updates is an array
    if (!Array.isArray(updates)) {
      throw new Error(`bulkUpdateEligibility expects an array, got ${typeof updates}`);
    }
    
    const results = [];
    const errors = [];

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      console.log(`Processing update ${i}:`, {
        update: JSON.stringify(update, null, 2),
        itemId: update?.itemId,
        educationLevels: update?.educationLevels,
        educationLevelsType: typeof update?.educationLevels,
        educationLevelsIsArray: Array.isArray(update?.educationLevels),
        educationLevelsConstructor: update?.educationLevels?.constructor?.name,
      });
      
      try {
        // Validate update object
        if (!update || typeof update !== 'object') {
          throw new Error(`Update at index ${i} must be an object`);
        }
        
        if (!update.itemId) {
          throw new Error(`Update at index ${i} is missing itemId`);
        }
        
        // Handle case where educationLevels might be undefined or null
        if (update.educationLevels === undefined || update.educationLevels === null) {
          throw new Error(`Update at index ${i} is missing educationLevels field`);
        }
        
        // Ensure educationLevels is an array - with defensive handling
        let educationLevelsToProcess = update.educationLevels;
        
        // Handle string case (JSON stringified array)
        if (typeof educationLevelsToProcess === 'string') {
          try {
            educationLevelsToProcess = JSON.parse(educationLevelsToProcess);
            console.log(`Normalized educationLevels from string for item ${update.itemId}`);
          } catch (e) {
            console.error(`Failed to parse educationLevels string for item ${update.itemId}:`, e);
            throw new Error(`educationLevels must be an array, got string that could not be parsed`);
          }
        }
        
        // Ensure it's an array
        if (!Array.isArray(educationLevelsToProcess)) {
          // Log detailed error information
          console.error(`Invalid educationLevels for item ${update.itemId}:`, {
            value: educationLevelsToProcess,
            valueStringified: JSON.stringify(educationLevelsToProcess),
            type: typeof educationLevelsToProcess,
            isArray: Array.isArray(educationLevelsToProcess),
            constructor: educationLevelsToProcess?.constructor?.name,
            prototype: Object.getPrototypeOf(educationLevelsToProcess),
            keys: typeof educationLevelsToProcess === 'object' ? Object.keys(educationLevelsToProcess) : 'N/A',
          });
          throw new Error(`educationLevels must be an array, got ${typeof educationLevelsToProcess}`);
        }
        
        // Create a fresh array copy to ensure it's a proper Array instance
        const educationLevelsArray = [...educationLevelsToProcess];
        
        console.log(`Processing update ${i} with educationLevels:`, educationLevelsArray);
        
        const result = await updateItemEligibility(
          update.itemId,
          educationLevelsArray
        );
        results.push(result.data);
      } catch (error) {
        console.error(`Error processing update ${i}:`, error);
        errors.push({
          itemId: update.itemId,
          error: error.message,
        });
      }
    }

    if (errors.length > 0) {
      console.error("Bulk update had errors:", errors);
      // If all updates failed, return error result instead of throwing
      // This allows the controller to handle it appropriately
      if (errors.length === updates.length) {
        return {
          success: false,
          data: [],
          errors: errors,
          message: errors[0].error || "All updates failed",
        };
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Bulk update eligibility error:", error);
    throw new Error(`Failed to bulk update eligibility: ${error.message}`);
  }
}

/**
 * Delete an item and its eligibility records
 * @param {string} itemId - Item UUID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteItem(itemId) {
  try {
    // Delete eligibility records (CASCADE should handle this, but explicit delete is safer)
    const { error: eligibilityError } = await supabase
      .from("item_eligibility")
      .delete()
      .eq("item_id", itemId);

    if (eligibilityError) throw eligibilityError;

    // Soft delete the item
    const { error: itemError } = await supabase
      .from("items")
      .update({ is_active: false })
      .eq("id", itemId);

    if (itemError) throw itemError;

    return {
      success: true,
      message: "Item deleted successfully",
    };
  } catch (error) {
    console.error("Delete item error:", error);
    throw new Error(`Failed to delete item: ${error.message}`);
  }
}

module.exports = {
  getEligibilityData,
  updateItemEligibility,
  bulkUpdateEligibility,
  removeDuplicateEligibility,
  backfillEligibilityForAllItems,
  deleteItem,
};
