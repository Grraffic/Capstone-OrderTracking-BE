const supabase = require("../../config/supabase");
const isProduction = process.env.NODE_ENV === "production";

/**
 * Inventory Service
 *
 * Handles inventory calculations and beginning inventory management
 */
class InventoryService {
  /**
   * Calculate ending inventory for an item
   * Ending Inventory = Beginning Inventory + Purchases - Released + Returns
   */
  async calculateEndingInventory(itemId, size = null) {
    try {
      const { data: item, error } = await supabase
        .from("items")
        .select("beginning_inventory, purchases, stock")
        .eq("id", itemId)
        .single();

      if (error) throw error;
      if (!item) throw new Error("Item not found");

      const beginningInventory = item.beginning_inventory || 0;
      const purchases = item.purchases || 0;

      // TODO: Calculate released and returns from orders/transactions
      // For now, we'll use stock as a proxy
      const released = 0;
      const returns = 0;

      const endingInventory =
        beginningInventory + purchases - released + returns;
      return Math.max(endingInventory, 0);
    } catch (error) {
      console.error("Calculate ending inventory error:", error);
      throw new Error(`Failed to calculate ending inventory: ${error.message}`);
    }
  }

  /**
   * Calculate available inventory
   * Available = Ending Inventory - Unreleased
   */
  async calculateAvailable(itemId, size = null) {
    try {
      const endingInventory = await this.calculateEndingInventory(itemId, size);

      // TODO: Calculate unreleased from orders table
      // Unreleased = SUM(quantity) from orders where status = 'pending' or 'confirmed'
      const unreleased = 0;

      const available = endingInventory - unreleased;
      return Math.max(available, 0);
    } catch (error) {
      console.error("Calculate available error:", error);
      throw new Error(`Failed to calculate available: ${error.message}`);
    }
  }

  /**
   * Check and reset beginning inventory if expired (>1 year)
   */
  async checkAndResetBeginningInventory(itemId) {
    try {
      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (fetchError) throw fetchError;
      if (!item) throw new Error("Item not found");

      if (!item.beginning_inventory_date) {
        // No beginning inventory date set, initialize it (FIFO: beginning unit price = current price)
        const endingInventory = await this.calculateEndingInventory(itemId);
        const beginningUnitPrice = Number(item.beginning_inventory_unit_price) ?? Number(item.price) ?? 0;
        const { data, error } = await supabase
          .from("items")
          .update({
            beginning_inventory: endingInventory,
            purchases: 0,
            beginning_inventory_date: new Date().toISOString(),
            fiscal_year_start: new Date().toISOString().split("T")[0],
            beginning_inventory_unit_price: beginningUnitPrice,
          })
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        return { reset: true, data };
      }

      // Check if expired (>365 days)
      const daysSinceStart = Math.floor(
        (new Date() - new Date(item.beginning_inventory_date)) /
          (1000 * 60 * 60 * 24)
      );

      if (daysSinceStart > 365) {
        // Reset beginning inventory (FIFO: new beginning uses current price as its unit price)
        const endingInventory = await this.calculateEndingInventory(itemId);
        const purchaseUnitPrice = Number(item.price) ?? 0;
        const { data, error } = await supabase
          .from("items")
          .update({
            beginning_inventory: endingInventory,
            purchases: 0,
            beginning_inventory_date: new Date().toISOString(),
            fiscal_year_start: new Date().toISOString().split("T")[0],
            beginning_inventory_unit_price: purchaseUnitPrice,
          })
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;
        return { reset: true, data, daysSinceStart };
      }

      return { reset: false, daysSinceStart };
    } catch (error) {
      console.error("Check and reset beginning inventory error:", error);
      throw new Error(`Failed to check beginning inventory: ${error.message}`);
    }
  }

  /**
   * Perform fiscal year rollover for all items
   * Carries forward ending inventory from prior year as beginning inventory for new fiscal year
   * Any items added after rollover date will be classified as purchases
   * 
   * @param {Date|string} rolloverDate - The date when fiscal year rolls over (defaults to today)
   * @returns {Promise<Object>} Rollover results with counts and details
   */
  async performFiscalYearRollover(rolloverDate = null) {
    try {
      const rolloverDateObj = rolloverDate 
        ? new Date(rolloverDate) 
        : new Date();
      
      const rolloverDateStr = rolloverDateObj.toISOString().split("T")[0];
      const rolloverDateTime = rolloverDateObj.toISOString();

      if (!isProduction) {
        console.log(`[Fiscal Year Rollover] 🗓️ Starting rollover for date: ${rolloverDateStr}`);
      }

      // Fetch all active items
      const { data: items, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("is_active", true);

      if (fetchError) throw fetchError;
      if (!items || items.length === 0) {
        return {
          success: true,
          message: "No active items found to rollover",
          itemsProcessed: 0,
          itemsUpdated: 0,
        };
      }

      let itemsUpdated = 0;
      let itemsSkipped = 0;
      const updatePromises = [];

      for (const item of items) {
        try {
          // Calculate ending inventory for this item
          const endingInventory = await this.calculateEndingInventory(item.id);
          
          // Check if this item already has a fiscal year start date after the rollover date
          // If so, it's already been rolled over, skip it
          if (item.fiscal_year_start) {
            const fiscalYearStart = new Date(item.fiscal_year_start);
            const rolloverDate = new Date(rolloverDateStr);
            if (fiscalYearStart >= rolloverDate) {
              itemsSkipped++;
              continue;
            }
          }

          // Prepare update: carry forward ending inventory as beginning inventory
          const updateData = {
            beginning_inventory: endingInventory,
            purchases: 0, // Reset purchases for new fiscal year
            beginning_inventory_date: rolloverDateTime,
            fiscal_year_start: rolloverDateStr,
          };

          // For JSON variant items, also reset variant-level purchases
          if (item.note) {
            try {
              const parsedNote = JSON.parse(item.note);
              if (
                parsedNote &&
                parsedNote._type === "sizeVariations" &&
                Array.isArray(parsedNote.sizeVariations)
              ) {
                // Reset purchases for each variant
                parsedNote.sizeVariations.forEach((variant) => {
                  // Calculate ending inventory for this variant
                  const variantStock = Number(variant.stock) || 0;
                  const variantBeginningInventory = Number(variant.beginning_inventory) || 0;
                  const variantPurchases = Number(variant.purchases) || 0;
                  
                  // Ending inventory = beginning + purchases (released/returns handled separately)
                  const variantEndingInventory = variantBeginningInventory + variantPurchases;
                  
                  // Carry forward ending as new beginning
                  variant.beginning_inventory = variantEndingInventory;
                  variant.purchases = 0;
                });
                updateData.note = JSON.stringify(parsedNote);
              }
            } catch (e) {
              // Not JSON or parse error, continue with regular update
            }
          }

          // Update item
          const updatePromise = supabase
            .from("items")
            .update(updateData)
            .eq("id", item.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error(`[Fiscal Year Rollover] ❌ Error updating item ${item.id}:`, updateError);
                throw updateError;
              }
              itemsUpdated++;
              if (!isProduction) {
                console.log(
                  `[Fiscal Year Rollover] ✅ Item "${item.name}" (${item.size || "N/A"}): ` +
                  `Ending=${endingInventory} → Beginning=${endingInventory}, Purchases reset to 0`
                );
              }
            });

          updatePromises.push(updatePromise);
        } catch (itemError) {
          console.error(`[Fiscal Year Rollover] ❌ Error processing item ${item.id}:`, itemError);
          // Continue with other items
        }
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      if (!isProduction) {
        console.log(
          `[Fiscal Year Rollover] ✅ Completed: ${itemsUpdated} items updated, ${itemsSkipped} items skipped`
        );
      }

      return {
        success: true,
        message: `Fiscal year rollover completed successfully`,
        rolloverDate: rolloverDateStr,
        itemsProcessed: items.length,
        itemsUpdated,
        itemsSkipped,
      };
    } catch (error) {
      console.error("[Fiscal Year Rollover] ❌ Error:", error);
      throw new Error(`Failed to perform fiscal year rollover: ${error.message}`);
    }
  }

  /**
   * Check if an item addition should be classified as a purchase
   * Items added after the fiscal year start date are purchases
   * 
   * @param {string} itemId - Item ID
   * @param {Date|string} additionDate - Date when stock is being added (defaults to now)
   * @returns {Promise<boolean>} True if should be classified as purchase
   */
  async isPurchaseAfterRollover(itemId, additionDate = null) {
    try {
      const { data: item, error } = await supabase
        .from("items")
        .select("fiscal_year_start, beginning_inventory_date")
        .eq("id", itemId)
        .single();

      if (error || !item) return true; // Default to purchase if can't determine

      const additionDateObj = additionDate ? new Date(additionDate) : new Date();
      const fiscalYearStart = item.fiscal_year_start 
        ? new Date(item.fiscal_year_start) 
        : (item.beginning_inventory_date ? new Date(item.beginning_inventory_date) : null);

      // If no fiscal year start date, classify as purchase
      if (!fiscalYearStart) return true;

      // If addition date is after fiscal year start, it's a purchase
      return additionDateObj >= fiscalYearStart;
    } catch (error) {
      console.error("[isPurchaseAfterRollover] Error:", error);
      return true; // Default to purchase on error
    }
  }

  /**
   * Get full inventory report
   */
  async getInventoryReport(filters = {}) {
    try {
      if (!isProduction) {
        console.log(
          `[getInventoryReport] 🔄 Starting inventory report generation at ${new Date().toISOString()}`
        );
      }

      // Force fresh data by not using any caching
      // Exclude archived items from inventory report
      const parsedStartDate = filters.startDate ? new Date(filters.startDate) : null;
      const parsedEndDate = filters.endDate ? new Date(filters.endDate) : null;
      const hasDateRange =
        parsedStartDate instanceof Date &&
        !Number.isNaN(parsedStartDate.getTime()) &&
        parsedEndDate instanceof Date &&
        !Number.isNaN(parsedEndDate.getTime());
      const startDateTime = hasDateRange
        ? new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth(), parsedStartDate.getDate(), 0, 0, 0, 0).toISOString()
        : null;
      const endDateTime = hasDateRange
        ? new Date(parsedEndDate.getFullYear(), parsedEndDate.getMonth(), parsedEndDate.getDate(), 23, 59, 59, 999).toISOString()
        : null;

      let query = supabase
        .from("items")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .or("is_archived.eq.false,is_archived.is.null");

      if (filters.educationLevel) {
        query = query.eq("education_level", filters.educationLevel);
      }
      if (hasDateRange) {
        query = query.gte("created_at", startDateTime).lte("created_at", endDateTime);
      }
      // Do NOT chain a second .or() for search — PostgREST/Supabase can drop or
      // mis-apply the first .or() (is_archived), so search is applied after fetch.

      // Order by created_at DESC so newest items appear first
      query = query.order("created_at", { ascending: false });

      const { data: items, error, count } = await query;
      if (error) throw error;

      const searchTerm =
        filters.search != null && String(filters.search).trim() !== ""
          ? String(filters.search).trim().toLowerCase()
          : "";

      const itemsFiltered = searchTerm
        ? (items || []).filter((item) => {
            const blob = [
              item.name,
              item.education_level,
              item.category,
              item.size,
              item.item_type,
              item.for_gender,
              item.note,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return blob.includes(searchTerm);
          })
        : items || [];

      // Log all items with purchases > 0 to verify data is being read correctly (dev only)
      if (!isProduction) {
        const itemsWithPurchases =
          itemsFiltered.filter((i) => (i.purchases || 0) > 0) || [];
        if (itemsWithPurchases.length > 0) {
          console.log(
            `[getInventoryReport] ✅ Found ${itemsWithPurchases.length} items with purchases > 0`
          );
        } else {
          console.log(
            `[getInventoryReport] ⚠️ WARNING: No items found with purchases > 0! This might indicate a data issue.`
          );
        }
        console.log(
          `[getInventoryReport] Fetched ${
            items?.length || 0
          } items from database, ${itemsFiltered.length} after search${
            searchTerm ? ` ("${searchTerm}")` : ""
          }`
        );
      }

      // Split items by size - each size becomes a separate row
      const reportData = [];

      for (const item of itemsFiltered) {
        // Check if item has JSON size variations or accessory entries
        let hasJsonVariations = false;
        let sizeVariations = [];
        let hasAccessoryEntries = false;
        let accessoryEntries = [];

        if (item.note) {
          try {
            const parsedNote = JSON.parse(item.note);
            if (
              parsedNote &&
              parsedNote._type === "sizeVariations" &&
              Array.isArray(parsedNote.sizeVariations)
            ) {
              hasJsonVariations = true;
              sizeVariations = parsedNote.sizeVariations;
            } else if (
              parsedNote &&
              parsedNote._type === "accessoryEntries" &&
              Array.isArray(parsedNote.accessoryEntries)
            ) {
              hasAccessoryEntries = true;
              accessoryEntries = parsedNote.accessoryEntries;
            }
          } catch (e) {
            // Not JSON, continue with regular processing
          }
        }

        if (hasAccessoryEntries && accessoryEntries.length > 0) {
          // Accessories: one row per item; FIFO from per-entry prices
          const totalStock = accessoryEntries.reduce(
            (sum, e) => sum + (Number(e.stock) || 0),
            0
          );
          const totalBeginningInventory = Number(accessoryEntries[0]?.beginning_inventory) || 0;
          const totalPurchases = accessoryEntries.slice(1).reduce(
            (sum, e) => sum + (Number(e.purchases) || 0),
            0
          );
          const begUnitPrice = Number(accessoryEntries[0]?.price) ?? Number(item.price) ?? 0;
          // FIFO total: entry[0].beginning_inventory * entry[0].price + Σ(entry[i].purchases * entry[i].price) for i >= 1
          let totalAmount = totalBeginningInventory * begUnitPrice;
          for (let i = 1; i < accessoryEntries.length; i++) {
            const entryPurchases = Number(accessoryEntries[i].purchases) || 0;
            const entryPrice = Number(accessoryEntries[i].price) ?? Number(item.price) ?? 0;
            totalAmount += entryPurchases * entryPrice;
          }
          // Display purchase unit price: last entry with purchases, or weighted fallback
          let purchUnitPrice = Number(item.price) || 0;
          for (let i = accessoryEntries.length - 1; i >= 1; i--) {
            if ((Number(accessoryEntries[i].purchases) || 0) > 0) {
              purchUnitPrice = Number(accessoryEntries[i].price) ?? purchUnitPrice;
              break;
            }
          }
          const endingInventory = totalBeginningInventory + totalPurchases;
          const unreleased = 0;
          const released = 0;
          const returns = 0;
          const reorderPoint = Number(item.reorder_point) || 0;
          let status = "Above Threshold";
          if (endingInventory === 0) status = "Out of Stock";
          else if (reorderPoint > 0 && endingInventory <= reorderPoint) status = "At Reorder Point";

          reportData.push({
            id: `${item.id}-accessory-${item.created_at || Date.now()}`,
            item_id: item.id,
            name: item.name,
            education_level: item.education_level,
            category: item.category,
            item_type: item.item_type,
            size: item.size || "N/A",
            stock: totalStock,
            beginning_inventory: totalBeginningInventory,
            purchases: totalPurchases,
            released,
            returns,
            unreleased,
            available: endingInventory,
            ending_inventory: endingInventory,
            unit_price: purchUnitPrice,
            purchase_unit_price: purchUnitPrice,
            unit_price_beginning: begUnitPrice,
            price: Number(item.price) || 0,
            total_amount: totalAmount,
            status,
            reorder_point: item.reorder_point || 0,
            beginning_inventory_date: item.beginning_inventory_date,
            fiscal_year_start: item.fiscal_year_start,
            created_at: item.created_at,
            updated_at: item.updated_at,
          });
        } else if (hasJsonVariations && sizeVariations.length > 0) {
          // Use the size from each variant as stored on the item (refer to items data)
          sizeVariations.forEach((variant) => {
            const variantSize = variant.size || "N/A";
            const variantStock = Number(variant.stock) || 0;
            // Per-variant purchase unit price when present; else variant.price (for display / backward compat)
            let variantPurchasePrice =
              variant.purchase_unit_price != null && !isNaN(Number(variant.purchase_unit_price))
                ? Number(variant.purchase_unit_price)
                : (Number(variant.price) || item.price || 0);
            // FIFO: first units use beginning-inventory unit price; next units use purchase (variant) price
            const variantBeginningUnitPrice = Number(variant.beginning_inventory_unit_price) ?? variantPurchasePrice;

            // Read beginning_inventory from variant JSON field if available (needed before deriving purchases)
            let variantBeginningInventory;
            if (
              variant.beginning_inventory !== undefined &&
              variant.beginning_inventory !== null
            ) {
              variantBeginningInventory =
                Number(variant.beginning_inventory) || 0;
            } else {
              variantBeginningInventory = item.beginning_inventory || 0;
            }

            // Per-size purchases: use variant.purchases or derive; when purchase_batches present, use sum of batch qty
            let variantPurchases;
            const hasPurchaseBatches = Array.isArray(variant.purchase_batches) && variant.purchase_batches.length > 0;
            if (hasPurchaseBatches) {
              variantPurchases = variant.purchase_batches.reduce(
                (sum, b) => sum + (Number(b.qty) || 0),
                0
              );
              const lastBatch = variant.purchase_batches[variant.purchase_batches.length - 1];
              if (lastBatch && (lastBatch.unit_price != null && !isNaN(Number(lastBatch.unit_price)))) {
                variantPurchasePrice = Number(lastBatch.unit_price);
              }
            } else if (variant.purchases !== undefined && variant.purchases !== null) {
              variantPurchases = Number(variant.purchases) || 0;
            } else if (
              variant.stock !== undefined &&
              variant.stock !== null
            ) {
              variantPurchases = Math.max(
                0,
                variantStock - variantBeginningInventory
              );
            } else {
              variantPurchases = 0;
            }

            // Read reorder_point from variant JSON field if available
            // For size-variation items, each variant can have its own reorder_point
            // If not set on variant, fall back to item-level reorder_point
            let variantReorderPoint;
            if (
              variant.reorder_point !== undefined &&
              variant.reorder_point !== null &&
              variant.reorder_point !== ""
            ) {
              variantReorderPoint = Number(variant.reorder_point) || 0;
            } else {
              // Fall back to item-level reorder_point if variant doesn't have one
              variantReorderPoint = Number(item.reorder_point) || 0;
            }

            // Calculate ending inventory: Beginning Inventory + Purchases - Released + Returns
            // For now, Released and Returns are 0 (will be calculated from orders in frontend)
            const endingInventory =
              variantBeginningInventory + variantPurchases;

            // Calculate available: Ending Inventory - Unreleased
            // Unreleased will be calculated from orders in frontend, so for now use ending inventory
            // The frontend will subtract unreleased orders
            const available = endingInventory; // Will be adjusted by frontend with unreleased count
            const unreleased = 0; // Calculated in frontend from orders
            const released = 0; // Calculated in frontend from orders
            const returns = 0;

            // Determine status based on ending inventory vs reorder_point (matches At Reorder Point table)
            let variantStatus = "Above Threshold";
            if (endingInventory === 0) {
              variantStatus = "Out of Stock";
            } else if (variantReorderPoint > 0 && endingInventory <= variantReorderPoint) {
              variantStatus = "At Reorder Point";
            }

            // FIFO total: when purchase_batches present use each batch's unit price; else single purchase price
            let totalAmount;
            if (hasPurchaseBatches) {
              totalAmount =
                variantBeginningInventory * variantBeginningUnitPrice +
                variant.purchase_batches.reduce(
                  (sum, b) => sum + (Number(b.qty) || 0) * (Number(b.unit_price) || 0),
                  0
                );
            } else {
              totalAmount =
                variantBeginningInventory * variantBeginningUnitPrice +
                variantPurchases * variantPurchasePrice;
            }

            reportData.push({
              id: `${item.id}-${variantSize}-${item.created_at || Date.now()}`, // Ensure uniqueness even for duplicates
              item_id: item.id, // Keep original item ID
              name: item.name,
              education_level: item.education_level,
              category: item.category,
              item_type: item.item_type,
              size: variantSize,
              stock: variantStock,
              beginning_inventory: variantBeginningInventory,
              purchases: variantPurchases, // Now reads from variant JSON or item-level
              released,
              returns,
              unreleased,
              available,
              ending_inventory: endingInventory,
              unit_price: variantPurchasePrice || Number(item.price) || 0,
              purchase_unit_price: variantPurchasePrice || Number(item.price) || 0,
              unit_price_beginning: variantBeginningUnitPrice || Number(item.price) || 0,
              price: Number(variant.price) || Number(item.price) || 0,
              total_amount: totalAmount,
              status: variantStatus,
              reorder_point: variantReorderPoint,
              beginning_inventory_date: item.beginning_inventory_date,
              fiscal_year_start: item.fiscal_year_start,
              created_at: item.created_at,
              updated_at: item.updated_at,
            });
          });
        } else {
          // Check if item has comma-separated sizes
          const itemSize = item.size || "N/A";
          const hasCommaSeparatedSizes =
            itemSize.includes(",") && itemSize !== "N/A";

          if (hasCommaSeparatedSizes) {
            // Split comma-separated sizes - each size becomes a separate row
            const sizes = itemSize
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

            // Distribute stock, beginning_inventory, and purchases across sizes
            // For now, we'll divide equally or use a simple distribution
            // TODO: Track per-size values in the future
            const stockPerSize = Math.floor((item.stock || 0) / sizes.length);
            const beginningInventoryPerSize = Math.floor(
              (item.beginning_inventory || 0) / sizes.length
            );
            const purchasesPerSize = Math.floor(
              (item.purchases || 0) / sizes.length
            );

            sizes.forEach((size, index) => {
              // For the last size, add any remainder
              const isLastSize = index === sizes.length - 1;
              const sizeStock = isLastSize
                ? (item.stock || 0) - stockPerSize * (sizes.length - 1)
                : stockPerSize;
              const sizeBeginningInventory = isLastSize
                ? (item.beginning_inventory || 0) -
                  beginningInventoryPerSize * (sizes.length - 1)
                : beginningInventoryPerSize;
              const sizePurchases = isLastSize
                ? (item.purchases || 0) - purchasesPerSize * (sizes.length - 1)
                : purchasesPerSize;

              // Calculate ending inventory: Beginning Inventory + Purchases - Released + Returns
              const endingInventory = sizeBeginningInventory + sizePurchases;

              // Calculate available: Ending Inventory - Unreleased
              // Unreleased will be calculated from orders in frontend
              const available = endingInventory; // Will be adjusted by frontend with unreleased count
              const unreleased = 0; // Calculated in frontend from orders
              const released = 0; // Calculated in frontend from orders
              const returns = 0;

              // Determine status based on ending inventory vs reorder_point (matches At Reorder Point table)
              const sizeReorderPoint = Number(item.reorder_point) || 0;
              let sizeStatus = "Above Threshold";
              if (endingInventory === 0) {
                sizeStatus = "Out of Stock";
              } else if (sizeReorderPoint > 0 && endingInventory <= sizeReorderPoint) {
                sizeStatus = "At Reorder Point";
              }

              // FIFO: beginning uses beginning_inventory_unit_price, purchases use price
              const begUnitPrice = Number(item.beginning_inventory_unit_price) ?? Number(item.price) ?? 0;
              const purchUnitPrice = Number(item.price) ?? 0;
              const totalAmount = sizeBeginningInventory * begUnitPrice + sizePurchases * purchUnitPrice;

              reportData.push({
                id: `${item.id}-${size}-${item.created_at || Date.now()}`, // Ensure uniqueness even for duplicates
                item_id: item.id, // Keep original item ID
                name: item.name,
                education_level: item.education_level,
                category: item.category,
                item_type: item.item_type,
                size: size,
                stock: sizeStock,
                beginning_inventory: sizeBeginningInventory,
                purchases: sizePurchases,
                released,
                returns,
                unreleased,
                available,
                ending_inventory: endingInventory,
                unit_price: purchUnitPrice || Number(item.price) || 0,
                purchase_unit_price: purchUnitPrice || Number(item.price) || 0,
                unit_price_beginning: begUnitPrice || Number(item.price) || 0,
                price: Number(item.price) || 0,
                total_amount: totalAmount,
                status: sizeStatus,
                reorder_point: item.reorder_point || 0, // Include reorder_point from item
                beginning_inventory_date: item.beginning_inventory_date,
                fiscal_year_start: item.fiscal_year_start,
                created_at: item.created_at,
                updated_at: item.updated_at,
              });
            });
          } else {
            // Single size item - add as is
            // Calculate ending inventory: Beginning Inventory + Purchases - Released + Returns
            const endingInventory =
              (item.beginning_inventory || 0) + (item.purchases || 0);

            // Calculate available: Ending Inventory - Unreleased
            // Don't use item.available from database as it might be outdated
            // The frontend will calculate unreleased from orders and subtract it
            const available = endingInventory; // Will be adjusted by frontend with unreleased count
            const unreleased = 0; // Calculated in frontend from orders
            const released = 0; // Calculated in frontend from orders
            const returns = 0;

            // Log purchases value from database for debugging (dev only)
            if (!isProduction && (item.purchases || 0) > 0) {
              console.log(
                `[getInventoryReport] ✅ Single-size item WITH PURCHASES: id=${
                  item.id
                }, name="${item.name}", size="${itemSize}", purchases=${
                  item.purchases || 0
                }`
              );
            }

            // FIFO: first units = beginning_inventory * beginning_inventory_unit_price; next = purchases * price
            const begUnitPrice = Number(item.beginning_inventory_unit_price) ?? Number(item.price) ?? 0;
            const purchUnitPrice = Number(item.price) ?? 0;
            const totalAmount =
              (item.beginning_inventory || 0) * begUnitPrice +
              (item.purchases || 0) * purchUnitPrice;

            // Determine status based on ending inventory vs reorder_point (matches At Reorder Point table)
            const singleReorderPoint = Number(item.reorder_point) || 0;
            let singleStatus = "Above Threshold";
            if (endingInventory === 0) {
              singleStatus = "Out of Stock";
            } else if (singleReorderPoint > 0 && endingInventory <= singleReorderPoint) {
              singleStatus = "At Reorder Point";
            }

            reportData.push({
              id: `${item.id}-${item.created_at || Date.now()}`, // Ensure uniqueness even for duplicates
              item_id: item.id, // Keep original item ID
              name: item.name,
              education_level: item.education_level,
              category: item.category,
              item_type: item.item_type,
              size: itemSize,
              stock: item.stock,
              beginning_inventory: item.beginning_inventory || 0,
              purchases: item.purchases || 0, // Verify this is reading correctly from database
              released,
              returns,
              unreleased,
              available,
              ending_inventory: endingInventory,
              unit_price: purchUnitPrice || Number(item.price) || 0,
              purchase_unit_price: purchUnitPrice || Number(item.price) || 0,
              unit_price_beginning: begUnitPrice || Number(item.price) || 0,
              price: Number(item.price) || 0,
              total_amount: totalAmount,
              status: singleStatus,
              reorder_point: item.reorder_point || 0, // Include reorder_point from item
              beginning_inventory_date: item.beginning_inventory_date,
              fiscal_year_start: item.fiscal_year_start,
              created_at: item.created_at,
              updated_at: item.updated_at,
            });
          }
        }
      }

      // Fetch purchase/return quantities from transactions and merge into report
      const normalizeSizeForKey = (s) =>
        (s || "N/A")
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s*\([^)]*\)/g, "")
          .trim() || "N/A";
      const purchaseSumsByItemSize = new Map();
      const returnSumsByItemSize = new Map();
      try {
        let purchaseTxQuery = supabase
          .from("transactions")
          .select("metadata,created_at")
          .eq("type", "Inventory")
          .eq("action", "PURCHASE RECORDED");
        let returnTxQuery = supabase
          .from("transactions")
          .select("metadata,created_at")
          .eq("type", "Inventory")
          .eq("action", "RETURN RECORDED");
        if (hasDateRange) {
          purchaseTxQuery = purchaseTxQuery
            .gte("created_at", startDateTime)
            .lte("created_at", endDateTime);
          returnTxQuery = returnTxQuery
            .gte("created_at", startDateTime)
            .lte("created_at", endDateTime);
        }
        const [{ data: purchaseTxList, error: purchaseTxError }, { data: returnTxList, error: txError }] = await Promise.all([
          purchaseTxQuery,
          returnTxQuery,
        ]);

        if (!purchaseTxError && purchaseTxList && purchaseTxList.length > 0) {
          for (const tx of purchaseTxList) {
            const meta = tx.metadata || {};
            const itemId = meta.item_id || null;
            const size = meta.size != null ? meta.size : "N/A";
            const qty = Number(meta.quantity) || 0;
            if (!itemId || qty <= 0) continue;
            const key = `${itemId}|${normalizeSizeForKey(size)}`;
            purchaseSumsByItemSize.set(key, (purchaseSumsByItemSize.get(key) || 0) + qty);
          }
        }

        if (!txError && returnTxList && returnTxList.length > 0) {
          for (const tx of returnTxList) {
            const meta = tx.metadata || {};
            const itemId = meta.item_id || null;
            const size = meta.size != null ? meta.size : "N/A";
            const qty = Number(meta.quantity) || 0;
            if (!itemId || qty <= 0) continue;
            const key = `${itemId}|${normalizeSizeForKey(size)}`;
            returnSumsByItemSize.set(key, (returnSumsByItemSize.get(key) || 0) + qty);
          }
        }
      } catch (e) {
        if (!isProduction) {
          console.warn("[getInventoryReport] Could not load return transactions:", e);
        }
      }

      for (const row of reportData) {
        const key = `${row.item_id}|${normalizeSizeForKey(row.size)}`;
        if (hasDateRange) {
          const txPurchasesInRange = purchaseSumsByItemSize.get(key) || 0;
          const rowCreatedAtMs = row.created_at ? new Date(row.created_at).getTime() : NaN;
          const startMs = new Date(startDateTime).getTime();
          const endMs = new Date(endDateTime).getTime();
          const isRowCreatedInRange =
            Number.isFinite(rowCreatedAtMs) &&
            Number.isFinite(startMs) &&
            Number.isFinite(endMs) &&
            rowCreatedAtMs >= startMs &&
            rowCreatedAtMs <= endMs;

          // Keep purchases coming from item creation data (e.g. accessoryEntries)
          // when the row itself was created in the selected period.
          const createdPurchasesInRange = isRowCreatedInRange
            ? Number(row.purchases) || 0
            : 0;

          row.purchases = txPurchasesInRange + createdPurchasesInRange;
        }
        row.returns = returnSumsByItemSize.get(key) || 0;
      }

      // Comprehensive logging to track purchases values through report generation (dev only)
      if (!isProduction) {
        console.log(
          `[getInventoryReport] ✅ Generated ${reportData.length} rows`
        );

        const rowsWithPurchases = reportData.filter(
          (row) => (row.purchases || 0) > 0
        );
        if (rowsWithPurchases.length > 0) {
          console.log(
            `[getInventoryReport] ✅ Found ${rowsWithPurchases.length} rows with purchases > 0`
          );
        } else {
          console.log(
            `[getInventoryReport] ⚠️ WARNING: No rows with purchases > 0 in report!`
          );
        }
      }

      return {
        success: true,
        data: reportData,
        total: reportData.length, // Return count of separated rows
      };
    } catch (error) {
      console.error("Get inventory report error:", error);
      throw new Error(`Failed to get inventory report: ${error.message}`);
    }
  }

  /**
   * Add stock to existing item (goes to purchases)
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to add
   * @param {string} size - Optional size (for size-specific items)
   * @param {number} unitPrice - Optional unit price
   * @param {object} io - Optional Socket.IO instance for real-time updates
   * @param {string} userId - Optional user ID who performed the action
   */
  async addStock(itemId, quantity, size = null, unitPrice = null, io = null, userId = null, userEmail = null) {
    try {
      if (!isProduction) {
        console.log(
          `[addStock] 🚀 Starting addStock: itemId=${itemId}, quantity=${quantity}, size="${size}", unitPrice=${unitPrice}`
        );
      }

      // Check and reset beginning inventory if expired (legacy 365-day check)
      await this.checkAndResetBeginningInventory(itemId);
      
      // Check if this addition should be classified as a purchase (after fiscal year rollover)
      const isPurchase = await this.isPurchaseAfterRollover(itemId);

      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (fetchError) {
        console.error(`[addStock] ❌ Error fetching item:`, fetchError);
        throw fetchError;
      }
      if (!item) {
        console.error(`[addStock] ❌ Item not found: itemId=${itemId}`);
        throw new Error("Item not found");
      }

      if (!isProduction) {
        console.log(
          `[addStock] 📦 Current item state: stock=${item.stock}, purchases=${
            item.purchases || 0
          }, beginning_inventory=${item.beginning_inventory || 0}, size="${
            item.size
          }"`
        );
      }

      // Check if this is a size-specific item with JSON variations
      let isJsonVariant = false;
      let variantIndex = -1;
      let parsedNote = null;

      if (item.note && size) {
        try {
          parsedNote = JSON.parse(item.note);
          if (
            parsedNote &&
            parsedNote._type === "sizeVariations" &&
            Array.isArray(parsedNote.sizeVariations)
          ) {
            // Normalize for comparison: lowercase, trim, collapse spaces, strip parentheses content
            const normalizeForMatch = (s) =>
              (s || "")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, " ")
                .replace(/\([^)]*\)/g, "")
                .trim();
            const targetNormalized = normalizeForMatch(size);

            // Find matching variant (exact or without parentheses)
            variantIndex = parsedNote.sizeVariations.findIndex((v) => {
              const vSize = (v.size || "").toLowerCase().trim();
              const targetSize = size.toLowerCase().trim();
              const vSizeNoParens = vSize.replace(/\([^)]*\)/g, "").trim();
              const targetSizeNoParens = targetSize.replace(/\([^)]*\)/g, "").trim();
              return (
                vSize === targetSize ||
                vSizeNoParens === targetSizeNoParens ||
                normalizeForMatch(v.size) === targetNormalized
              );
            });

            // Fallback: match by core size name only (e.g. "Small (S)" and "Small" both -> "small")
            if (variantIndex === -1 && parsedNote.sizeVariations.length > 0) {
              variantIndex = parsedNote.sizeVariations.findIndex((v) => {
                return normalizeForMatch(v.size) === targetNormalized;
              });
            }

            if (variantIndex !== -1) {
              isJsonVariant = true;
            }
          }
        } catch (e) {
          // Not JSON or parse error, treat as regular item
        }
      }

      // If item has sizeVariations and size was provided but no variant matched,
      // do NOT update row stock (that would leave note out of sync and modal would show old stock).
      if (
        parsedNote &&
        parsedNote._type === "sizeVariations" &&
        Array.isArray(parsedNote.sizeVariations) &&
        parsedNote.sizeVariations.length > 0 &&
        size &&
        variantIndex === -1
      ) {
        const availableSizes = parsedNote.sizeVariations
          .map((v) => v.size)
          .join(", ");
        throw new Error(
          `Size "${size}" not found in this item's size variations. Available: ${availableSizes}. Add stock only to one of these sizes.`
        );
      }

      // Handle JSON variant stock update
      if (isJsonVariant && parsedNote && variantIndex !== -1) {
        const variant = parsedNote.sizeVariations[variantIndex];
        const currentVariantStock = Number(variant.stock) || 0;
        const newVariantStock = currentVariantStock + quantity;

        // Update variant stock
        parsedNote.sizeVariations[variantIndex].stock = newVariantStock;

        // Recalculate total stock from all variants
        const newTotalStock = parsedNote.sizeVariations.reduce(
          (sum, v) => sum + (Number(v.stock) || 0),
          0
        );

        // Add to purchases: append to purchase_batches so each add has its own unit price
        const currentVariantPurchases =
          Number(parsedNote.sizeVariations[variantIndex].purchases) || 0;
        const newVariantPurchases = currentVariantPurchases + quantity;

        let purchaseBatches = Array.isArray(parsedNote.sizeVariations[variantIndex].purchase_batches)
          ? parsedNote.sizeVariations[variantIndex].purchase_batches
          : [];
        if (purchaseBatches.length === 0 && currentVariantPurchases > 0) {
          const up = parsedNote.sizeVariations[variantIndex].purchase_unit_price ?? parsedNote.sizeVariations[variantIndex].price;
          purchaseBatches = [{ qty: currentVariantPurchases, unit_price: Number(up) || 0 }];
        }
        const newBatch = {
          qty: quantity,
          unit_price: unitPrice != null && !isNaN(Number(unitPrice)) ? Number(unitPrice) : (Number(variant.price) || 0),
        };
        purchaseBatches = [...purchaseBatches, newBatch];
        parsedNote.sizeVariations[variantIndex].purchase_batches = purchaseBatches;
        parsedNote.sizeVariations[variantIndex].purchases = purchaseBatches.reduce((s, b) => s + (Number(b.qty) || 0), 0);

        if (unitPrice != null) {
          parsedNote.sizeVariations[variantIndex].price = unitPrice;
          parsedNote.sizeVariations[variantIndex].purchase_unit_price = unitPrice;
        }

        // Also update item-level purchases for backward compatibility
        const newPurchases = (item.purchases || 0) + quantity;
        // beginning_inventory remains the same - never changes after first creation

        if (!isProduction) {
          console.log(
            `[addStock] 📊 Variant purchases update (JSON variant): variant="${variant.size}", current=${currentVariantPurchases}, adding=${quantity}, new=${parsedNote.sizeVariations[variantIndex].purchases}`
          );
        }

        const updateData = {
          stock: newTotalStock,
          purchases: newPurchases, // Item-level purchases (for backward compatibility)
          // beginning_inventory is NOT updated - it stays the same
          note: JSON.stringify(parsedNote), // Contains variant-level purchases and purchase_batches
        };

        const { data, error } = await supabase
          .from("items")
          .update(updateData)
          .eq("id", itemId)
          .select()
          .single();

        if (error) {
          console.error(
            `[addStock] ❌ Database update error (JSON variant):`,
            error
          );
          throw error;
        }

        if (!isProduction) {
          console.log(
            `[addStock] ✅ Update successful (JSON variant): updated_stock=${data?.stock}, updated_purchases=${data?.purchases}, beginning_inventory=${data?.beginning_inventory}`
          );
        }

        // Verify purchases was actually updated (always check, but only log errors)
        if (data.purchases === undefined || data.purchases === null) {
          console.error(
            `[addStock] ⚠️ WARNING: Updated item (JSON variant) does not have purchases field!`
          );
        } else if (data.purchases !== newPurchases) {
          console.error(
            `[addStock] ⚠️ WARNING: Purchases mismatch (JSON variant)! Expected ${newPurchases}, got ${data.purchases}`
          );
        }

        // CRITICAL: Re-fetch the item from database to verify the update persisted (dev only)
        if (!isProduction) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure commit
          const { data: verifyData, error: verifyError } = await supabase
            .from("items")
            .select("*")
            .eq("id", itemId)
            .single();

          if (verifyError) {
            console.error(
              `[addStock] ❌ Error verifying update (JSON variant):`,
              verifyError
            );
          } else if (verifyData.purchases !== newPurchases) {
            console.error(
              `[addStock] ❌ CRITICAL: Database verification failed (JSON variant)! Purchases not persisted correctly. Expected ${newPurchases}, got ${verifyData.purchases}`
            );
            // Use verified data if it's different
            data.purchases = verifyData.purchases;
            data.stock = verifyData.stock;
            data.beginning_inventory = verifyData.beginning_inventory;
          }
        }

        // Log transaction for stock addition (purchase) - JSON variant
        try {
          const TransactionService = require("../../services/transaction.service");
          const itemName = data.name;
          const variantSize = variant.size || "N/A";
          const details = `Purchase recorded: ${quantity} unit(s) of ${itemName} (Size: ${variantSize})${unitPrice ? ` at ₱${unitPrice} per unit` : ""}`;
          await TransactionService.logTransaction(
            "Inventory",
            "PURCHASE RECORDED",
            userId,
            details,
            {
              item_id: data.id,
              item_name: itemName,
              size: variantSize,
              quantity: quantity,
              unit_price: unitPrice,
              previous_stock: currentVariantStock,
              new_stock: newVariantStock,
              previous_purchases: currentVariantPurchases,
              new_purchases: newVariantPurchases,
            }
          );
        } catch (txError) {
          console.error("Failed to log transaction for stock addition:", txError);
        }

        // Emit socket event to notify clients of updated purchases/stock for JSON variants too
        if (io) {
          io.emit("item:updated", {
            id: data.id,
            name: data.name,
            stock: data.stock,
            purchases: data.purchases,
            beginning_inventory: data.beginning_inventory,
            size: size || variant.size || data.size,
            updated_at: data.updated_at,
          });
        }

        return {
          success: true,
          data,
          message: `Added ${quantity} units to ${size} size (purchases). New ${size} stock: ${newVariantStock}, Total stock: ${newTotalStock}. Beginning inventory unchanged.`,
        };
      } else {
        // Regular item or size column item
        const currentStock = item.stock || 0;
        const currentPurchases = item.purchases || 0;
        const currentBeginningInventory = item.beginning_inventory || 0;
        const newStock = currentStock + quantity;

        // IMPORTANT: Add to purchases, beginning_inventory stays unchanged
        const newPurchases = currentPurchases + quantity;
        // beginning_inventory remains the same - never changes after first creation

        if (!isProduction) {
          console.log(
            `[addStock] Updating item ${itemId}: current_stock=${currentStock}, current_purchases=${currentPurchases}, adding=${quantity}, new_stock=${newStock}, new_purchases=${newPurchases}, beginning_inventory=${currentBeginningInventory} (unchanged)`
          );
        }

        const updateData = {
          stock: newStock,
          purchases: newPurchases,
          // beginning_inventory is NOT updated - it stays the same
        };

        // Update price if provided
        if (unitPrice !== null) {
          updateData.price = unitPrice;
        }

        const { data, error } = await supabase
          .from("items")
          .update(updateData)
          .eq("id", itemId)
          .select()
          .single();

        if (error) {
          console.error(`[addStock] ❌ Database update error:`, error);
          throw error;
        }

        if (!isProduction) {
          console.log(
            `[addStock] ✅ Update successful: updated_stock=${data?.stock}, updated_purchases=${data?.purchases}, beginning_inventory=${data?.beginning_inventory}`
          );
        }

        // Verify purchases was actually updated (always check, but only log errors)
        if (data.purchases === undefined || data.purchases === null) {
          console.error(
            `[addStock] ⚠️ WARNING: Updated item does not have purchases field!`
          );
        } else if (data.purchases !== newPurchases) {
          console.error(
            `[addStock] ⚠️ WARNING: Purchases mismatch! Expected ${newPurchases}, got ${data.purchases}`
          );
        }

        // CRITICAL: Re-fetch the item from database to verify the update persisted (dev only)
        if (!isProduction) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure commit
          const { data: verifyData, error: verifyError } = await supabase
            .from("items")
            .select("*")
            .eq("id", itemId)
            .single();

          if (verifyError) {
            console.error(`[addStock] ❌ Error verifying update:`, verifyError);
          } else if (verifyData.purchases !== newPurchases) {
            console.error(
              `[addStock] ❌ CRITICAL: Database verification failed! Purchases not persisted correctly. Expected ${newPurchases}, got ${verifyData.purchases}`
            );
            console.error(
              `[addStock] This suggests a trigger or transaction issue. Check database triggers.`
            );
            // Use verified data if it's different
            data.purchases = verifyData.purchases;
            data.stock = verifyData.stock;
            data.beginning_inventory = verifyData.beginning_inventory;
          }
        }

        // Emit socket event to notify clients of the update
        if (io) {
          io.emit("item:updated", {
            id: data.id,
            name: data.name,
            stock: data.stock,
            purchases: data.purchases,
            beginning_inventory: data.beginning_inventory,
            size: data.size,
            updated_at: data.updated_at,
          });
          console.log(
            `[addStock] Emitted item:updated event for item ${data.id}`
          );
        }

        // Verify response includes purchases (always check, but only log errors)
        if (!data.purchases && data.purchases !== 0) {
          console.error(
            `[addStock] ⚠️ WARNING: Response data missing purchases field!`
          );
        }

        // Log transaction for stock addition (purchase)
        try {
          const TransactionService = require("../../services/transaction.service");
          const itemName = data.name;
          const itemSize = size || data.size || "N/A";
          const details = `Purchase recorded: ${quantity} unit(s) of ${itemName}${itemSize !== "N/A" ? ` (Size: ${itemSize})` : ""}${unitPrice ? ` at ₱${unitPrice} per unit` : ""}`;
          // Note: userId will be passed from controller if available
          await TransactionService.logTransaction(
            "Inventory",
            `PURCHASE RECORDED ${itemName}`,
            userId, // Use userId passed from controller
            details,
            {
              item_id: data.id,
              item_name: itemName,
              size: itemSize,
              quantity: quantity,
              unit_price: unitPrice,
              previous_stock: currentVariantStock || item.stock,
              new_stock: newVariantStock || newStock,
              previous_purchases: currentVariantPurchases || item.purchases || 0,
              new_purchases: newVariantPurchases || newPurchases,
            },
            userEmail // Pass userEmail as fallback for user lookup
          );
        } catch (txError) {
          // Don't fail stock addition if transaction logging fails
          console.error("Failed to log transaction for stock addition:", txError);
        }

        // Log transaction for stock addition (purchase) - regular item
        try {
          const TransactionService = require("../../services/transaction.service");
          const itemName = data.name;
          const itemSize = size || data.size || "N/A";
          const details = `Purchase recorded: ${quantity} unit(s) of ${itemName}${itemSize !== "N/A" ? ` (Size: ${itemSize})` : ""}${unitPrice ? ` at ₱${unitPrice} per unit` : ""}`;
          await TransactionService.logTransaction(
            "Inventory",
            `PURCHASE RECORDED ${itemName}`,
            userId,
            details,
            {
              item_id: data.id,
              item_name: itemName,
              size: itemSize,
              quantity: quantity,
              unit_price: unitPrice,
              previous_stock: currentStock,
              new_stock: newStock,
              previous_purchases: currentPurchases,
              new_purchases: newPurchases,
            },
            userEmail // Pass userEmail as fallback for user lookup
          );
        } catch (txError) {
          console.error("Failed to log transaction for stock addition:", txError);
        }

        return {
          success: true,
          data,
          message: `Added ${quantity} units to purchases. New total stock: ${newStock}. Beginning inventory unchanged.`,
        };
      }
    } catch (error) {
      console.error(`[addStock] ❌ Add stock error:`, error);
      console.error(`[addStock] Error stack:`, error.stack);
      throw new Error(`Failed to add stock: ${error.message}`);
    }
  }

  /**
   * Record a return (student returned item). Increases stock only (not purchases) and logs "RETURN RECORDED" so it appears in the Returns table.
   */
  async recordReturn(itemId, quantity, size = null, unitPrice = null, io = null, userId = null, userEmail = null) {
    try {
      if (!isProduction) {
        console.log(
          `[recordReturn] 🚀 Starting recordReturn: itemId=${itemId}, quantity=${quantity}, size="${size}"`
        );
      }

      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (fetchError || !item) {
        console.error(`[recordReturn] ❌ Item not found: itemId=${itemId}`);
        throw new Error("Item not found");
      }

      let isJsonVariant = false;
      let variantIndex = -1;
      let parsedNote = null;

      if (item.note && size) {
        try {
          parsedNote = JSON.parse(item.note);
          if (
            parsedNote &&
            parsedNote._type === "sizeVariations" &&
            Array.isArray(parsedNote.sizeVariations)
          ) {
            const normalizeForMatch = (s) =>
              (s || "")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, " ")
                .replace(/\([^)]*\)/g, "")
                .trim();
            const targetNormalized = normalizeForMatch(size);
            variantIndex = parsedNote.sizeVariations.findIndex((v) => {
              const vSize = (v.size || "").toLowerCase().trim();
              const targetSize = size.toLowerCase().trim();
              const vSizeNoParens = vSize.replace(/\([^)]*\)/g, "").trim();
              const targetSizeNoParens = targetSize.replace(/\([^)]*\)/g, "").trim();
              return (
                vSize === targetSize ||
                vSizeNoParens === targetSizeNoParens ||
                normalizeForMatch(v.size) === targetNormalized
              );
            });
            if (variantIndex === -1 && parsedNote.sizeVariations.length > 0) {
              variantIndex = parsedNote.sizeVariations.findIndex((v) =>
                normalizeForMatch(v.size) === targetNormalized
              );
            }
            if (variantIndex !== -1) isJsonVariant = true;
          }
        } catch (e) {
          // not JSON
        }
      }

      if (
        parsedNote &&
        parsedNote._type === "sizeVariations" &&
        Array.isArray(parsedNote.sizeVariations) &&
        parsedNote.sizeVariations.length > 0 &&
        size &&
        variantIndex === -1
      ) {
        const availableSizes = parsedNote.sizeVariations.map((v) => v.size).join(", ");
        throw new Error(`Size "${size}" not found. Available: ${availableSizes}`);
      }

      if (isJsonVariant && parsedNote && variantIndex !== -1) {
        const variant = parsedNote.sizeVariations[variantIndex];
        const currentVariantStock = Number(variant.stock) || 0;
        const newVariantStock = currentVariantStock + quantity;
        parsedNote.sizeVariations[variantIndex].stock = newVariantStock;
        const newTotalStock = parsedNote.sizeVariations.reduce(
          (sum, v) => sum + (Number(v.stock) || 0),
          0
        );
        const updateData = {
          stock: newTotalStock,
          note: JSON.stringify(parsedNote),
        };
        if (unitPrice != null) {
          parsedNote.sizeVariations[variantIndex].price = unitPrice;
          updateData.note = JSON.stringify(parsedNote);
        }

        const { data, error } = await supabase
          .from("items")
          .update(updateData)
          .eq("id", itemId)
          .select()
          .single();

        if (error) throw error;

        try {
          const TransactionService = require("../../services/transaction.service");
          const itemName = data.name;
          const variantSize = variant.size || "N/A";
          const details = `Return recorded: ${quantity} unit(s) of ${itemName} (Size: ${variantSize})${unitPrice ? ` at ₱${unitPrice} per unit` : ""}`;
          await TransactionService.logTransaction(
            "Inventory",
            "RETURN RECORDED",
            userId,
            details,
            {
              item_id: data.id,
              item_name: itemName,
              size: variantSize,
              quantity: quantity,
              unit_price: unitPrice,
              previous_stock: currentVariantStock,
              new_stock: newVariantStock,
            },
            userEmail
          );
        } catch (txError) {
          console.error("Failed to log return transaction:", txError);
        }

        if (io) {
          io.emit("item:updated", { itemId: data.id, ...data });
        }

        return {
          success: true,
          data,
          message: `Return recorded: ${quantity} unit(s) added to ${size}. New ${size} stock: ${newVariantStock}.`,
        };
      }

      // Regular item (no size or single size)
      const currentStock = item.stock || 0;
      const newStock = currentStock + quantity;
      const updateData = { stock: newStock };
      if (unitPrice != null) updateData.price = unitPrice;

      const { data, error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      try {
        const TransactionService = require("../../services/transaction.service");
        const itemName = data.name;
        const itemSize = size || data.size || "N/A";
        const details = `Return recorded: ${quantity} unit(s) of ${itemName}${itemSize !== "N/A" ? ` (Size: ${itemSize})` : ""}${unitPrice ? ` at ₱${unitPrice} per unit` : ""}`;
        await TransactionService.logTransaction(
          "Inventory",
          "RETURN RECORDED",
          userId,
          details,
          {
            item_id: data.id,
            item_name: itemName,
            size: itemSize,
            quantity: quantity,
            unit_price: unitPrice,
            previous_stock: currentStock,
            new_stock: newStock,
          },
          userEmail
        );
      } catch (txError) {
        console.error("Failed to log return transaction:", txError);
      }

      if (io) {
        io.emit("item:updated", { itemId: data.id, ...data });
      }

      return {
        success: true,
        data,
        message: `Return recorded: ${quantity} unit(s). New total stock: ${newStock}.`,
      };
    } catch (error) {
      console.error(`[recordReturn] ❌ Error:`, error);
      throw new Error(`Failed to record return: ${error.message}`);
    }
  }

  /**
   * Manually reset beginning inventory
   */
  async resetBeginningInventory(itemId) {
    try {
      const endingInventory = await this.calculateEndingInventory(itemId);

      const { data, error } = await supabase
        .from("items")
        .update({
          beginning_inventory: endingInventory,
          purchases: 0,
          beginning_inventory_date: new Date().toISOString(),
          fiscal_year_start: new Date().toISOString().split("T")[0],
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: "Beginning inventory reset successfully",
      };
    } catch (error) {
      console.error("Reset beginning inventory error:", error);
      throw new Error(`Failed to reset beginning inventory: ${error.message}`);
    }
  }
}

module.exports = new InventoryService();
