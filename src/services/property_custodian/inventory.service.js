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
      let query = supabase
        .from("items")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .or("is_archived.eq.false,is_archived.is.null");

      if (filters.educationLevel) {
        query = query.eq("education_level", filters.educationLevel);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,education_level.ilike.%${filters.search}%,category.ilike.%${filters.search}%`
        );
      }

      // Order by created_at DESC so newest items appear first
      query = query.order("created_at", { ascending: false });

      const { data: items, error, count } = await query;
      if (error) throw error;

      // Log all items with purchases > 0 to verify data is being read correctly (dev only)
      if (!isProduction) {
        const itemsWithPurchases =
          items?.filter((i) => (i.purchases || 0) > 0) || [];
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
          } items from database`
        );
      }

      // Split items by size - each size becomes a separate row
      const reportData = [];

      for (const item of items || []) {
        // Check if item has JSON size variations
        let hasJsonVariations = false;
        let sizeVariations = [];

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
            }
          } catch (e) {
            // Not JSON, continue with regular processing
          }
        }

        if (hasJsonVariations && sizeVariations.length > 0) {
          // Use the size from each variant as stored on the item (refer to items data)
          sizeVariations.forEach((variant) => {
            const variantSize = variant.size || "N/A";
            const variantStock = Number(variant.stock) || 0;
            const variantPurchasePrice = Number(variant.price) || item.price || 0;
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

            // Per-size purchases only: use variant's value or derive from this size's stock - beginning_inventory.
            // Never use item-level purchases for a specific size (so Medium stays 0 when only Small got +10).
            let variantPurchases;
            if (variant.purchases !== undefined && variant.purchases !== null) {
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

            // Determine status based on variant stock vs reorder_point (matches At Reorder Point table)
            let variantStatus = "Above Threshold";
            if (variantStock === 0) {
              variantStatus = "Out of Stock";
            } else if (variantReorderPoint > 0 && variantStock <= variantReorderPoint) {
              variantStatus = "At Reorder Point";
            }

            // FIFO total: (beginning_inventory * beginning unit price) + (purchases * purchase unit price)
            const totalAmount =
              variantBeginningInventory * variantBeginningUnitPrice +
              variantPurchases * variantPurchasePrice;

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

              // Determine status based on size stock vs reorder_point (matches At Reorder Point table)
              const sizeReorderPoint = Number(item.reorder_point) || 0;
              let sizeStatus = "Above Threshold";
              if (sizeStock === 0) {
                sizeStatus = "Out of Stock";
              } else if (sizeReorderPoint > 0 && sizeStock <= sizeReorderPoint) {
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

            // Determine status based on stock vs reorder_point (matches At Reorder Point table)
            const singleReorderPoint = Number(item.reorder_point) || 0;
            const singleStock = Number(item.stock) || 0;
            let singleStatus = "Above Threshold";
            if (singleStock === 0) {
              singleStatus = "Out of Stock";
            } else if (singleReorderPoint > 0 && singleStock <= singleReorderPoint) {
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

      // Fetch return quantities from transactions (RETURN RECORDED) and merge into report
      const normalizeSizeForKey = (s) =>
        (s || "N/A")
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s*\([^)]*\)/g, "")
          .trim() || "N/A";
      const returnSumsByItemSize = new Map();
      try {
        const { data: returnTxList, error: txError } = await supabase
          .from("transactions")
          .select("metadata")
          .eq("type", "Inventory")
          .eq("action", "RETURN RECORDED");

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

      // Check and reset beginning inventory if expired
      await this.checkAndResetBeginningInventory(itemId);

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

        // IMPORTANT: Add to purchases per variant in JSON structure
        // Store purchases at variant level for accurate tracking per size
        const currentVariantPurchases =
          Number(parsedNote.sizeVariations[variantIndex].purchases) || 0;
        const newVariantPurchases = currentVariantPurchases + quantity;
        parsedNote.sizeVariations[variantIndex].purchases = newVariantPurchases;

        // Also update item-level purchases for backward compatibility
        const newPurchases = (item.purchases || 0) + quantity;
        // beginning_inventory remains the same - never changes after first creation

        if (!isProduction) {
          console.log(
            `[addStock] 📊 Variant purchases update (JSON variant): variant="${variant.size}", current=${currentVariantPurchases}, adding=${quantity}, new=${newVariantPurchases}`
          );
        }

        const updateData = {
          stock: newTotalStock,
          purchases: newPurchases, // Item-level purchases (for backward compatibility)
          // beginning_inventory is NOT updated - it stays the same
          note: JSON.stringify(parsedNote), // Contains variant-level purchases
        };

        // Update price if provided
        if (unitPrice !== null) {
          parsedNote.sizeVariations[variantIndex].price = unitPrice;
          updateData.note = JSON.stringify(parsedNote);
        }

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
