const supabase = require("../config/supabase");

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

      const endingInventory = beginningInventory + purchases - released + returns;
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
        // No beginning inventory date set, initialize it
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
        return { reset: true, data };
      }

      // Check if expired (>365 days)
      const daysSinceStart = Math.floor(
        (new Date() - new Date(item.beginning_inventory_date)) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceStart > 365) {
        // Reset beginning inventory
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
        return { reset: true, data, daysSinceStart };
      }

      return { reset: false, daysSinceStart };
    } catch (error) {
      console.error("Check and reset beginning inventory error:", error);
      throw new Error(
        `Failed to check beginning inventory: ${error.message}`
      );
    }
  }

  /**
   * Get full inventory report
   */
  async getInventoryReport(filters = {}) {
    try {
      console.log(`[getInventoryReport] 🔄 Starting inventory report generation at ${new Date().toISOString()}`);
      
      // Force fresh data by not using any caching
      let query = supabase
        .from("items")
        .select("*", { count: "exact" })
        .eq("is_active", true);

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
      
      // Log all items with purchases > 0 to verify data is being read correctly
      const itemsWithPurchases = items?.filter(i => (i.purchases || 0) > 0) || [];
      if (itemsWithPurchases.length > 0) {
        console.log(`[getInventoryReport] ✅ Found ${itemsWithPurchases.length} items with purchases > 0:`, 
          itemsWithPurchases.map(i => ({
            id: i.id,
            name: i.name,
            size: i.size,
            purchases: i.purchases,
            beginning_inventory: i.beginning_inventory,
            stock: i.stock
          }))
        );
      } else {
        console.log(`[getInventoryReport] ⚠️ WARNING: No items found with purchases > 0! This might indicate a data issue.`);
      }

      // Log raw data from database to verify purchases values
      console.log(`[getInventoryReport] Fetched ${items?.length || 0} items from database`);
      if (items && items.length > 0) {
        // Log items that might be the one we're looking for (Jersey, Junior Dress, etc.)
        const sampleItems = items.filter(i => 
          i.name?.toLowerCase().includes('jersey') || 
          i.name?.toLowerCase().includes('junior dress') || 
          i.name?.toLowerCase().includes('dress')
        );
        if (sampleItems.length > 0) {
          console.log(`[getInventoryReport] Sample items from DB (Jersey/Dress):`, 
            sampleItems.map(item => ({
              id: item.id,
              name: item.name,
              size: item.size,
              stock: item.stock,
              beginning_inventory: item.beginning_inventory,
              purchases: item.purchases,
              created_at: item.created_at
            }))
          );
        }
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
          // Split by JSON variations - each variant becomes a separate row
          sizeVariations.forEach((variant) => {
            const variantSize = variant.size || "N/A";
            const variantStock = Number(variant.stock) || 0;
            const variantPrice = Number(variant.price) || item.price || 0;

            // Read purchases from variant JSON field (per-variant tracking)
            // If variant has purchases field, use it; otherwise fall back to item-level purchases
            let variantPurchases;
            if (variant.purchases !== undefined && variant.purchases !== null) {
              // Variant has its own purchases field - use it
              variantPurchases = Number(variant.purchases) || 0;
              console.log(`[getInventoryReport] ✅ Using variant-level purchases for "${item.name}" size "${variantSize}": ${variantPurchases}`);
            } else {
              // Variant doesn't have purchases field - fall back to item-level (backward compatibility)
              variantPurchases = item.purchases || 0;
              console.log(`[getInventoryReport] ⚠️ Variant "${variantSize}" for "${item.name}" lacks purchases field, using item-level purchases: ${variantPurchases}`);
            }

            // Read beginning_inventory from variant JSON field if available
            // Otherwise, fall back to item-level beginning_inventory
            let variantBeginningInventory;
            if (variant.beginning_inventory !== undefined && variant.beginning_inventory !== null) {
              variantBeginningInventory = Number(variant.beginning_inventory) || 0;
              console.log(`[getInventoryReport] ✅ Using variant-level beginning_inventory for "${item.name}" size "${variantSize}": ${variantBeginningInventory}`);
            } else {
              // Fallback: use item-level beginning_inventory (for items without per-variant tracking)
              variantBeginningInventory = item.beginning_inventory || 0;
              console.log(`[getInventoryReport] ⚠️ Variant "${variantSize}" for "${item.name}" lacks beginning_inventory field, using item-level: ${variantBeginningInventory}`);
            }

            // Calculate ending inventory: Beginning Inventory + Purchases - Released + Returns
            // For now, Released and Returns are 0 (will be calculated from orders in frontend)
            const endingInventory = variantBeginningInventory + variantPurchases;
            
            // Calculate available: Ending Inventory - Unreleased
            // Unreleased will be calculated from orders in frontend, so for now use ending inventory
            // The frontend will subtract unreleased orders
            const available = endingInventory; // Will be adjusted by frontend with unreleased count
            const unreleased = 0; // Calculated in frontend from orders
            const released = 0; // Calculated in frontend from orders
            const returns = 0;

            // Determine status based on variant stock
            let variantStatus = "Above Threshold";
            if (variantStock === 0) variantStatus = "Out of Stock";
            else if (variantStock < 20) variantStatus = "Critical";
            else if (variantStock < 50) variantStatus = "At Reorder Point";

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
              unit_price: variantPrice,
              total_amount: variantBeginningInventory * variantPrice + variantPurchases * variantPrice,
              status: variantStatus,
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

              // Determine status based on size stock
              let sizeStatus = "Above Threshold";
              if (sizeStock === 0) sizeStatus = "Out of Stock";
              else if (sizeStock < 20) sizeStatus = "Critical";
              else if (sizeStock < 50) sizeStatus = "At Reorder Point";

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
              unit_price: item.price,
              total_amount:
                sizeBeginningInventory * item.price +
                sizePurchases * item.price,
              status: sizeStatus,
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

            // Log purchases value from database for debugging
            // Log ALL items, but highlight items with purchases > 0
            if ((item.purchases || 0) > 0) {
              console.log(`[getInventoryReport] ✅ Single-size item WITH PURCHASES: id=${item.id}, name="${item.name}", size="${itemSize}", stock=${item.stock}, beginning_inventory=${item.beginning_inventory || 0}, purchases=${item.purchases || 0} (from DB)`);
            } else {
              console.log(`[getInventoryReport] Single-size item: id=${item.id}, name="${item.name}", size="${itemSize}", stock=${item.stock}, beginning_inventory=${item.beginning_inventory || 0}, purchases=${item.purchases || 0} (from DB)`);
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
              unit_price: item.price,
              total_amount:
                (item.beginning_inventory || 0) * item.price +
                (item.purchases || 0) * item.price,
              status: item.status,
              beginning_inventory_date: item.beginning_inventory_date,
              fiscal_year_start: item.fiscal_year_start,
              created_at: item.created_at,
              updated_at: item.updated_at,
            });
          }
        }
      }

      // Comprehensive logging to track purchases values through report generation
      console.log(`[getInventoryReport] ✅ Generated ${reportData.length} rows`);
      
      // Log summary of purchases values by item type
      // Track which items had JSON variations for better logging
      const itemsWithJsonVariations = new Set();
      items.forEach(item => {
        if (item.note) {
          try {
            const parsed = JSON.parse(item.note);
            if (parsed?._type === "sizeVariations" && parsed?.sizeVariations?.length > 0) {
              itemsWithJsonVariations.add(item.id);
            }
          } catch (e) {}
        }
      });
      
      const jsonVariantRows = reportData.filter(row => itemsWithJsonVariations.has(row.item_id));
      const singleSizeRows = reportData.filter(row => !itemsWithJsonVariations.has(row.item_id));
      
      console.log(`[getInventoryReport] 📊 Report breakdown: ${jsonVariantRows.length} JSON variant rows, ${singleSizeRows.length} single-size/comma-separated rows`);
      
      // Log all items with purchases > 0 to verify they're included
      const rowsWithPurchases = reportData.filter(row => (row.purchases || 0) > 0);
      if (rowsWithPurchases.length > 0) {
        console.log(`[getInventoryReport] ✅ Found ${rowsWithPurchases.length} rows with purchases > 0:`, 
          rowsWithPurchases.map(r => ({
            name: r.name,
            size: r.size,
            purchases: r.purchases,
            beginning_inventory: r.beginning_inventory,
            stock: r.stock,
            source: itemsWithJsonVariations.has(r.item_id) ? 'JSON variant' : 'Single-size'
          }))
        );
      } else {
        console.log(`[getInventoryReport] ⚠️ WARNING: No rows with purchases > 0 in report!`);
      }
      
      // Log JSON variant rows specifically to verify purchases are being read correctly
      const jsonVariantRowsWithPurchases = jsonVariantRows.filter(row => (row.purchases || 0) > 0);
      if (jsonVariantRowsWithPurchases.length > 0) {
        console.log(`[getInventoryReport] ✅ JSON variant rows with purchases: ${jsonVariantRowsWithPurchases.length}`, 
          jsonVariantRowsWithPurchases.map(r => ({
            name: r.name,
            size: r.size,
            purchases: r.purchases,
            beginning_inventory: r.beginning_inventory
          }))
        );
      } else if (jsonVariantRows.length > 0) {
        console.log(`[getInventoryReport] ⚠️ WARNING: ${jsonVariantRows.length} JSON variant rows found, but none have purchases > 0!`);
      }
      
      // Log sample rows to verify purchases values
      if (reportData.length > 0) {
        // Find items that might be the problematic ones (Jersey, etc.)
        const sampleRows = reportData.filter(r => 
          r.name?.toLowerCase().includes('jersey') || 
          r.name?.toLowerCase().includes('junior dress') ||
          r.name?.toLowerCase().includes('dress')
        );
        if (sampleRows.length > 0) {
          console.log('[getInventoryReport] Sample rows (Jersey/Dress):', 
            sampleRows.map(r => ({
              id: r.id,
              name: r.name,
              size: r.size,
              beginning_inventory: r.beginning_inventory,
              purchases: r.purchases,
              stock: r.stock,
              item_id: r.item_id
            }))
          );
        } else {
          console.log('[getInventoryReport] Sample row (first):', {
            id: reportData[0].id,
            name: reportData[0].name,
            size: reportData[0].size,
            beginning_inventory: reportData[0].beginning_inventory,
            purchases: reportData[0].purchases,
            stock: reportData[0].stock,
            item_id: reportData[0].item_id
          });
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
   */
  async addStock(itemId, quantity, size = null, unitPrice = null, io = null) {
    try {
      console.log(`[addStock] 🚀 Starting addStock: itemId=${itemId}, quantity=${quantity}, size="${size}", unitPrice=${unitPrice}`);
      
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
      
      console.log(`[addStock] 📦 Current item state: stock=${item.stock}, purchases=${item.purchases || 0}, beginning_inventory=${item.beginning_inventory || 0}, size="${item.size}"`);

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
            // Find matching variant
            variantIndex = parsedNote.sizeVariations.findIndex((v) => {
              const vSize = (v.size || "").toLowerCase().trim();
              const targetSize = size.toLowerCase().trim();
              // Match exact or partial (e.g., "Small (S)" matches "Small" or "S")
              return (
                vSize === targetSize ||
                vSize.includes(targetSize) ||
                targetSize.includes(vSize) ||
                vSize.replace(/\([^)]*\)/g, "").trim() === targetSize ||
                targetSize.replace(/\([^)]*\)/g, "").trim() === vSize
              );
            });

            if (variantIndex !== -1) {
              isJsonVariant = true;
            }
          }
        } catch (e) {
          // Not JSON or parse error, treat as regular item
        }
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
        const currentVariantPurchases = Number(parsedNote.sizeVariations[variantIndex].purchases) || 0;
        const newVariantPurchases = currentVariantPurchases + quantity;
        parsedNote.sizeVariations[variantIndex].purchases = newVariantPurchases;

        // Also update item-level purchases for backward compatibility
        const newPurchases = (item.purchases || 0) + quantity;
        // beginning_inventory remains the same - never changes after first creation

        console.log(`[addStock] 📊 Variant purchases update (JSON variant): variant="${variant.size}", current=${currentVariantPurchases}, adding=${quantity}, new=${newVariantPurchases}`);

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

        console.log(`[addStock] 📝 Updating database (JSON variant) with:`, updateData);
        
        const { data, error } = await supabase
          .from("items")
          .update(updateData)
          .eq("id", itemId)
          .select()
          .single();

        if (error) {
          console.error(`[addStock] ❌ Database update error (JSON variant):`, error);
          throw error;
        }

        console.log(
          `[addStock] ✅ Update successful (JSON variant): updated_stock=${data?.stock}, updated_purchases=${data?.purchases}, beginning_inventory=${data?.beginning_inventory}`
        );
        
        // Verify purchases was actually updated
        if (data.purchases === undefined || data.purchases === null) {
          console.error(`[addStock] ⚠️ WARNING: Updated item (JSON variant) does not have purchases field! Data:`, JSON.stringify(data, null, 2));
        } else if (data.purchases !== newPurchases) {
          console.error(`[addStock] ⚠️ WARNING: Purchases mismatch (JSON variant)! Expected ${newPurchases}, got ${data.purchases}`);
        } else {
          console.log(`[addStock] ✅ Verified (JSON variant): purchases correctly updated to ${data.purchases}`);
        }
        
        // CRITICAL: Re-fetch the item from database to verify the update persisted
        console.log(`[addStock] 🔍 Re-fetching item from database to verify persistence (JSON variant)...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure commit
        const { data: verifyData, error: verifyError } = await supabase
          .from("items")
          .select("*")
          .eq("id", itemId)
          .single();
        
        if (verifyError) {
          console.error(`[addStock] ❌ Error verifying update (JSON variant):`, verifyError);
        } else {
          console.log(`[addStock] 🔍 Verification query result (JSON variant):`, {
            id: verifyData.id,
            stock: verifyData.stock,
            purchases: verifyData.purchases,
            beginning_inventory: verifyData.beginning_inventory,
            updated_at: verifyData.updated_at
          });
          
          if (verifyData.purchases !== newPurchases) {
            console.error(`[addStock] ❌ CRITICAL: Database verification failed (JSON variant)! Purchases not persisted correctly. Expected ${newPurchases}, got ${verifyData.purchases}`);
            // Use verified data if it's different
            data.purchases = verifyData.purchases;
            data.stock = verifyData.stock;
            data.beginning_inventory = verifyData.beginning_inventory;
          } else {
            console.log(`[addStock] ✅ Database verification passed (JSON variant): purchases=${verifyData.purchases} persisted correctly`);
          }
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

        console.log(
          `[addStock] Updating item ${itemId}: current_stock=${currentStock}, current_purchases=${currentPurchases}, adding=${quantity}, new_stock=${newStock}, new_purchases=${newPurchases}, beginning_inventory=${currentBeginningInventory} (unchanged)`
        );

        const updateData = {
          stock: newStock,
          purchases: newPurchases,
          // beginning_inventory is NOT updated - it stays the same
        };

        // Update price if provided
        if (unitPrice !== null) {
          updateData.price = unitPrice;
        }

        console.log(`[addStock] 📝 Updating database with:`, updateData);
        
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

        console.log(
          `[addStock] ✅ Update successful: updated_stock=${data?.stock}, updated_purchases=${data?.purchases}, beginning_inventory=${data?.beginning_inventory}`
        );
        
        // Verify purchases was actually updated
        if (data.purchases === undefined || data.purchases === null) {
          console.error(`[addStock] ⚠️ WARNING: Updated item does not have purchases field! Data:`, JSON.stringify(data, null, 2));
        } else if (data.purchases !== newPurchases) {
          console.error(`[addStock] ⚠️ WARNING: Purchases mismatch! Expected ${newPurchases}, got ${data.purchases}`);
        } else {
          console.log(`[addStock] ✅ Verified: purchases correctly updated to ${data.purchases}`);
        }
        
        // CRITICAL: Re-fetch the item from database to verify the update persisted
        console.log(`[addStock] 🔍 Re-fetching item from database to verify persistence...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure commit
        const { data: verifyData, error: verifyError } = await supabase
          .from("items")
          .select("*")
          .eq("id", itemId)
          .single();
        
        if (verifyError) {
          console.error(`[addStock] ❌ Error verifying update:`, verifyError);
        } else {
          console.log(`[addStock] 🔍 Verification query result:`, {
            id: verifyData.id,
            stock: verifyData.stock,
            purchases: verifyData.purchases,
            beginning_inventory: verifyData.beginning_inventory,
            updated_at: verifyData.updated_at
          });
          
          if (verifyData.purchases !== newPurchases) {
            console.error(`[addStock] ❌ CRITICAL: Database verification failed! Purchases not persisted correctly. Expected ${newPurchases}, got ${verifyData.purchases}`);
            console.error(`[addStock] This suggests a trigger or transaction issue. Check database triggers.`);
            // Use verified data if it's different
            data.purchases = verifyData.purchases;
            data.stock = verifyData.stock;
            data.beginning_inventory = verifyData.beginning_inventory;
          } else {
            console.log(`[addStock] ✅ Database verification passed: purchases=${verifyData.purchases} persisted correctly`);
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
          console.log(`[addStock] Emitted item:updated event for item ${data.id}`);
        }

        // Verify response includes purchases
        if (!data.purchases && data.purchases !== 0) {
          console.error(`[addStock] ⚠️ WARNING: Response data missing purchases field!`, JSON.stringify(data, null, 2));
        }
        
        console.log(`[addStock] ✅ Returning response with purchases=${data.purchases}`);
        
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
      throw new Error(
        `Failed to reset beginning inventory: ${error.message}`
      );
    }
  }
}

module.exports = new InventoryService();

