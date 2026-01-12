const supabase = require("../../config/supabase");
const NotificationService = require("../notification.service");
const OrderService = require("./order.service");
const isProduction = process.env.NODE_ENV === "production";

/**
 * Items Service
 *
 * Handles all business logic for items management including:
 * - CRUD operations for items
 * - Stock adjustments
 * - Statistics calculations
 * - Low stock alerts
 * - Status calculations (handled by database triggers)
 * - Restock notifications for pre-orders
 */
class ItemsService {
  /**
   * Get all items with optional filtering and pagination
   */
  async getItems(filters = {}, page = 1, limit = 10) {
    try {
      let query = supabase
        .from("items")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      if (filters.educationLevel)
        query = query.eq("education_level", filters.educationLevel);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.itemType) query = query.eq("item_type", filters.itemType);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,category.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const from = (page - 1) * limit;
      query = query
        .range(from, from + limit - 1)
        .order("created_at", { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error("Get items error:", error);
      throw new Error(`Failed to fetch items: ${error.message}`);
    }
  }

  /**
   * Get single item by ID
   */
  async getItemById(id) {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      if (!data) throw new Error("Item not found");
      return { success: true, data };
    } catch (error) {
      console.error("Get item by ID error:", error);
      throw new Error(`Failed to fetch item: ${error.message}`);
    }
  }

  /**
   * Normalize size string for comparison (trim, lowercase, remove parentheses)
   * @param {string} size - Size string to normalize
   * @returns {string} - Normalized size string
   */
  _normalizeSize(size) {
    if (!size || size === "N/A") return "N/A";
    return size
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\([^)]*\)/g, "") // Remove parentheses and content
      .trim();
  }

  /**
   * Create new item
   */
  async createItem(itemData, io = null, userId = null, userEmail = null) {
    try {
      const requiredFields = [
        "name",
        "education_level",
        "category",
        "item_type",
        "stock",
        "price",
      ];
      for (const field of requiredFields) {
        if (!itemData[field] && itemData[field] !== 0)
          throw new Error(`Missing required field: ${field}`);
      }

      if (
        itemData.image &&
        typeof itemData.image === "string" &&
        itemData.image.startsWith("data:")
      ) {
        console.warn(
          "Received base64 image. Expected a URL. Using default image."
        );
        itemData.image = "/assets/image/card1.png";
      }

      // Check if item+size combination already exists
      // If exists, add stock to purchases (beginning inventory never changes after first creation)
      // Only create new item if item+size doesn't exist
      const itemSize = itemData.size || "N/A";

      console.log(
        `[createItem] Checking for duplicates: name="${itemData.name}", education_level="${itemData.education_level}", size="${itemSize}"`
      );

      // Optimized: Only fetch items matching name and education_level (case-insensitive)
      // This is much more efficient than fetching all active items
      const { data: potentialItems, error: queryError } = await supabase
        .from("items")
        .select("*")
        .eq("is_active", true)
        .ilike("name", itemData.name.trim())
        .ilike("education_level", itemData.education_level.trim());

      if (queryError) {
        console.error(
          "[createItem] Error querying existing items:",
          queryError
        );
        // Don't throw - continue with creation if query fails
        // This prevents blocking item creation due to query issues
      }

      // Manual filtering for exact case-insensitive match (double-check)
      // This ensures we catch any edge cases with .ilike() matching
      const finalExistingItems = (potentialItems || []).filter((item) => {
        if (!item.name || !itemData.name) return false;
        if (!item.education_level || !itemData.education_level) return false;

        const nameMatch =
          item.name.toLowerCase().trim() === itemData.name.toLowerCase().trim();
        const educationMatch =
          item.education_level.toLowerCase().trim() ===
          itemData.education_level.toLowerCase().trim();

        return nameMatch && educationMatch;
      });

      // Logging only in development or when needed
      if (!isProduction || finalExistingItems.length > 0) {
        console.log(
          `[createItem] Query result: Found ${
            potentialItems?.length || 0
          } potential items, ${
            finalExistingItems.length
          } with exact matching name+education_level`
        );
      }

      // Log all existing items for debugging
      if (finalExistingItems && finalExistingItems.length > 0) {
        console.log(
          `[createItem] Existing items details:`,
          finalExistingItems.map((item) => ({
            id: item.id,
            name: item.name,
            size: item.size,
            stock: item.stock,
            purchases: item.purchases || 0,
            beginning_inventory: item.beginning_inventory || 0,
            created_at: item.created_at,
          }))
        );
      }

      let existingItem = null;
      let matchingSize = null;
      let isExistingSize = false;

      // Normalize sizes before comparison
      const normalizedItemSize = this._normalizeSize(itemSize);
      console.log(
        `[createItem] Normalized item size: "${normalizedItemSize}" (original: "${itemSize}")`
      );

      if (finalExistingItems && finalExistingItems.length > 0) {
        // First, check for exact size match in size column (using normalized comparison)
        // If item exists with same size, it's a duplicate - add to purchases
        console.log(
          `[createItem] Checking ${finalExistingItems.length} existing items for size match...`
        );
        existingItem = finalExistingItems.find((item) => {
          const itemNormalizedSize = this._normalizeSize(item.size);
          const matches = itemNormalizedSize === normalizedItemSize;
          if (matches) {
            console.log(
              `[createItem] ✅ Size match found! Item ID: ${item.id}, normalized sizes: "${itemNormalizedSize}" === "${normalizedItemSize}"`
            );
          }
          return matches;
        });

        if (existingItem) {
          // Item+size already exists - add to purchases, don't create duplicate
          isExistingSize = true;
          const existingNormalizedSize = this._normalizeSize(existingItem.size);
          console.log(
            `[createItem] ✅ DUPLICATE DETECTED: Found existing item ID: ${existingItem.id}, name: "${existingItem.name}", size: "${existingItem.size}" (normalized: "${existingNormalizedSize}"). Will add stock to purchases.`
          );
        } else {
          console.log(
            `[createItem] No exact size match found. Checking JSON variations and comma-separated sizes...`
          );
          // Check for JSON variations if no exact match
          if (itemData.note) {
            try {
              const newParsedNote = JSON.parse(itemData.note);
              if (
                newParsedNote &&
                newParsedNote._type === "sizeVariations" &&
                Array.isArray(newParsedNote.sizeVariations)
              ) {
                // Check each existing item for matching size in JSON variations
                for (const existing of finalExistingItems) {
                  if (existing.note) {
                    try {
                      const existingParsed = JSON.parse(existing.note);
                      if (
                        existingParsed &&
                        existingParsed._type === "sizeVariations" &&
                        Array.isArray(existingParsed.sizeVariations)
                      ) {
                        // Check if any new variant matches any existing variant
                        for (const newVariant of newParsedNote.sizeVariations) {
                          const newVariantSize = this._normalizeSize(
                            newVariant.size
                          );
                          const matchingVariant =
                            existingParsed.sizeVariations.find(
                              (existingVariant) => {
                                const existingVariantSize = this._normalizeSize(
                                  existingVariant.size
                                );
                                // Match exact only - don't use includes() as it causes false matches
                                // (e.g., "Small" would incorrectly match "XSmall")
                                // Only match if normalized sizes are exactly equal
                                return newVariantSize === existingVariantSize;
                              }
                            );

                          if (matchingVariant) {
                            // Item+size variant already exists - add to purchases, don't create duplicate
                            existingItem = existing;
                            matchingSize = newVariant.size;
                            isExistingSize = true;
                            console.log(
                              `[createItem] ✅ DUPLICATE DETECTED (JSON variant): Found existing item ID: ${existing.id}, name: "${itemData.name}" with JSON variant size "${newVariant.size}". Will add stock to purchases.`
                            );
                            break;
                          }
                        }
                        if (isExistingSize) break;
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
              }
            } catch (e) {
              // Not JSON, continue
            }
          }

          // Also check if item has comma-separated sizes that include the target size
          if (!isExistingSize) {
            for (const existing of finalExistingItems) {
              const existingSize = existing.size || "N/A";
              if (existingSize.includes(",")) {
                const normalizedSizes = existingSize
                  .split(",")
                  .map((s) => this._normalizeSize(s));
                const targetSizeNormalized = this._normalizeSize(itemSize);
                // Only match exact - don't use includes() as it causes false matches
                // (e.g., "Small" would incorrectly match "XSmall")
                if (
                  normalizedSizes.some(
                    (s) => s === targetSizeNormalized
                  )
                ) {
                  // Item+size already exists in comma-separated sizes - add to purchases
                  existingItem = existing;
                  isExistingSize = true;
                  console.log(
                    `[createItem] ✅ DUPLICATE DETECTED (comma-separated): Found existing item ID: ${existing.id}, name: "${existing.name}", with comma-separated size containing "${itemSize}". Will add stock to purchases.`
                  );
                  break;
                }
              }
            }
          }
        }
      }

      // If item+size already exists, add stock to purchases (don't create duplicate)
      // This ensures beginning inventory never changes after first creation
      console.log(
        `[createItem] Duplicate check result: isExistingSize=${isExistingSize}, existingItem=${
          existingItem ? existingItem.id : "null"
        }`
      );

      // Safety check: if isExistingSize is true but existingItem is null, log error
      if (isExistingSize && !existingItem) {
        console.error(
          `[createItem] ⚠️ ERROR: isExistingSize=true but existingItem is null! This should not happen.`
        );
        console.error(`[createItem] Debug info:`, {
          itemSize,
          normalizedItemSize,
          existingItemsCount: finalExistingItems?.length || 0,
          itemDataName: itemData.name,
          itemDataEducationLevel: itemData.education_level,
        });
        // Fall through to create new item instead of crashing
        isExistingSize = false;
      }

      if (isExistingSize && existingItem) {
        const InventoryService = require("./inventory.service");
        const stockToAdd = itemData.stock || 0;

        console.log(
          `[createItem] Item "${itemData.name}" with size "${
            matchingSize || itemSize
          }" already exists. Adding ${stockToAdd} to purchases of original entry.`
        );
        console.log(
          `[createItem] Existing item details: ID=${
            existingItem.id
          }, current_stock=${existingItem.stock}, current_purchases=${
            existingItem.purchases || 0
          }, current_beginning_inventory=${
            existingItem.beginning_inventory || 0
          }`
        );

        // Use addStock method to add to purchases of the ORIGINAL entry
        // This ensures beginning_inventory stays unchanged, only purchases increase
        console.log(
          `[createItem] 🔄 Calling addStock with: itemId=${
            existingItem.id
          }, quantity=${stockToAdd}, size="${
            matchingSize || itemSize
          }", price=${itemData.price}`
        );

        const result = await InventoryService.addStock(
          existingItem.id,
          stockToAdd,
          matchingSize || itemSize,
          itemData.price,
          io, // Pass socket.io instance for real-time updates
          userId, // Pass userId for transaction logging
          userEmail // Pass userEmail for transaction logging
        );

        console.log(
          `[createItem] ✅ After addStock: new_stock=${result.data?.stock}, new_purchases=${result.data?.purchases}, beginning_inventory=${result.data?.beginning_inventory}`
        );

        // Verify the response includes purchases
        if (!result.data || result.data.purchases === undefined) {
          console.error(
            `[createItem] ⚠️ WARNING: addStock response does not include purchases! Response:`,
            JSON.stringify(result, null, 2)
          );
        } else {
          console.log(
            `[createItem] ✅ Verified: purchases=${result.data.purchases} in response`
          );
        }

        // Ensure response includes all necessary fields
        // Use result.data if available (from addStock), otherwise construct from existingItem
        const responseData = result.data || {
          ...existingItem,
          stock: (existingItem.stock || 0) + stockToAdd,
          purchases: (existingItem.purchases || 0) + stockToAdd,
        };

        // Explicitly ensure purchases is in the response
        if (
          responseData.purchases === undefined ||
          responseData.purchases === null
        ) {
          console.error(
            `[createItem] ⚠️ WARNING: Response data missing purchases! Using calculated value.`
          );
          responseData.purchases = (existingItem.purchases || 0) + stockToAdd;
        }

        console.log(`[createItem] 📤 Preparing final response with:`, {
          id: responseData.id,
          purchases: responseData.purchases,
          stock: responseData.stock,
          beginning_inventory: responseData.beginning_inventory,
          isExisting: true,
        });

        return {
          success: true,
          data: responseData,
          message: `Item "${itemData.name}" with size "${
            matchingSize || itemSize
          }" already exists. Added ${stockToAdd} units to purchases. Beginning inventory unchanged.`,
          isExisting: true,
        };
      }

      // Item is truly new - set beginning_inventory for the first time
      console.log(
        `[createItem] Creating new item "${
          itemData.name
        }" with size "${itemSize}". Setting beginning_inventory = ${
          itemData.stock || 0
        }.`
      );

      // Only for truly NEW item+size combinations: Set beginning inventory
      // Beginning inventory is set ONLY on first creation and never changes
      const itemToInsert = {
        ...itemData,
        beginning_inventory: itemData.stock || 0,
        purchases: 0, // New items start with 0 purchases
        beginning_inventory_date: new Date().toISOString(),
        fiscal_year_start: new Date().toISOString().split("T")[0], // Current date
      };

      const { data, error } = await supabase
        .from("items")
        .insert([itemToInsert])
        .select()
        .single();
      if (error) throw error;

      let notificationInfo = { notified: 0 };
      if (data.stock > 0)
        notificationInfo = await this.handleRestockNotifications(data, io);

      // Log transaction for item creation
      try {
        const TransactionService = require("../../services/transaction.service");
        const itemSize = data.size || "N/A";
        const variantCount = data.note ? (JSON.parse(data.note)?.sizeVariations?.length || 0) : 0;
        const details = variantCount > 0 
          ? `Item created: ${data.name} (${data.education_level}) with ${variantCount} variant(s)`
          : `Item created: ${data.name} (${data.education_level})${itemSize !== "N/A" ? ` - Size: ${itemSize}` : ""}`;
        // Format details to match reference: "Beginning inventory: 20 units at 100 pesos"
        const formattedDetails = data.beginning_inventory > 0
          ? `Beginning Inventory: ${data.beginning_inventory} units${data.price > 0 ? ` at P${data.price}` : ""}`
          : details;
        
        console.log(`[createItem] 📝 Logging transaction for new item:`, {
          type: "Item",
          action: `ITEM CREATED ${data.name}`,
          userId: userId,
          details: formattedDetails,
          beginning_inventory: data.beginning_inventory,
          price: data.price,
        });
        
        // Pass both userId and userEmail to transaction service for better lookup
        const txResult = await TransactionService.logTransaction(
          "Item",
          `ITEM CREATED ${data.name}`,
          userId, // Pass userId (may be UUID, email, or Google ID)
          formattedDetails,
          {
            item_id: data.id,
            item_name: data.name,
            education_level: data.education_level,
            category: data.category,
            item_type: data.item_type,
            size: itemSize,
            stock: data.stock,
            price: data.price,
            beginning_inventory: data.beginning_inventory,
            variant_count: variantCount,
          },
          userEmail // Pass userEmail as fallback for user lookup
        );
        
        console.log(`[createItem] ✅ Transaction logged successfully:`, txResult);
      } catch (txError) {
        console.error("[createItem] ❌ Failed to log transaction for item creation:", txError);
        console.error("[createItem] Transaction error details:", {
          message: txError.message,
          stack: txError.stack,
        });
      }

      return {
        success: true,
        data,
        message: "Item created successfully",
        notificationInfo,
      };
    } catch (error) {
      console.error("Create item error:", error);
      throw new Error(`Failed to create item: ${error.message}`);
    }
  }

  /**
   * Update existing item
   */
  async updateItem(id, updates, io = null) {
    try {
      const { data: currentItem, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Item not found");

      if (
        updates.image &&
        typeof updates.image === "string" &&
        updates.image.startsWith("data:")
      ) {
        console.warn(
          "Received base64 image. Expected a URL. Using default image."
        );
        updates.image = "/assets/image/card1.png";
      }

      const wasOutOfStock =
        currentItem.stock === 0 || currentItem.status === "Out of Stock";
      const newStock =
        updates.stock !== undefined ? updates.stock : currentItem.stock;
      const isRestocked = wasOutOfStock && newStock > 0;

      // Handle beginning inventory and purchases logic
      const InventoryService = require("./inventory.service");

      // Check if beginning inventory expired and reset if needed
      await InventoryService.checkAndResetBeginningInventory(id);

      // IMPORTANT: If stock is being increased, add difference to purchases
      // beginning_inventory NEVER changes after first creation
      if (updates.stock !== undefined && updates.stock > currentItem.stock) {
        const stockDifference = updates.stock - currentItem.stock;
        const currentPurchases = currentItem.purchases || 0;
        updates.purchases = currentPurchases + stockDifference;
      }

      // ALWAYS protect beginning_inventory from being changed
      // Remove beginning_inventory and beginning_inventory_date from updates
      delete updates.beginning_inventory;
      delete updates.beginning_inventory_date;

      const { id: _, created_at, ...allowedUpdates } = updates;
      const { data, error } = await supabase
        .from("items")
        .update(allowedUpdates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Item not found");

      let notificationInfo = null;

      // Re-fetch fresh data to get updated stock/note for checks
      const { data: updatedItemData, error: refetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (!refetchError && updatedItemData) {
        // Determine if effectively restocked (including JSON variants)
        let effectivelyRestocked = false;

        // Check standard stock
        if (wasOutOfStock && updatedItemData.stock > 0) {
          effectivelyRestocked = true;
        }

        // OR Check JSON variants if available
        if (updatedItemData.note) {
          try {
            const parsed = JSON.parse(updatedItemData.note);
            if (
              parsed?._type === "sizeVariations" &&
              Array.isArray(parsed.sizeVariations)
            ) {
              // Find all variants that have stock > 0
              // This allows us to notify specifically for the sizes that are now available
              const availableVariants = parsed.sizeVariations.filter(
                (v) => (Number(v.stock) || 0) > 0
              );

              if (availableVariants.length > 0) {
                effectivelyRestocked = true;

                // Notify for EACH available size variant
                // This ensures that if "Large" is restocked, we notify for "Large" specifically
                for (const variant of availableVariants) {
                  const variantItem = {
                    ...updatedItemData,
                    size: variant.size, // Override size with variant size
                  };
                  console.log(
                    `📦 JSON Variant restocked: ${updatedItemData.name} (${updatedItemData.education_level}) - Size: ${variant.size}`
                  );
                  // We don't await here to avoid blocking response, but in this context waiting is safer to ensure it runs
                  await this.handleRestockNotifications(variantItem, io);
                }

                // Prevent the generic notification below since we handled it here
                isRestocked = false;
                effectivelyRestocked = false; // Set to false to skip the generic block below
              }
            }
          } catch (e) {
            console.warn(
              "Failed to parse/process item note for notifications:",
              e
            );
          }
        }

        if (effectivelyRestocked || isRestocked) {
          console.log(
            `📦 Item restocked (Generic/Standard): ${updatedItemData.name} (${updatedItemData.education_level})`
          );
          notificationInfo = await this.handleRestockNotifications(
            updatedItemData,
            io
          );
        }
      }

      // Log transaction for item update
      try {
        const TransactionService = require("../../services/transaction.service");
        const updatedFields = Object.keys(allowedUpdates).filter(key => key !== 'updated_at');
        const finalData = updatedItemData || data;
        const details = `Item details updated: ${finalData.name} (${finalData.education_level}) - Changed: ${updatedFields.join(", ")}`;
        await TransactionService.logTransaction(
          "Item",
          `ITEM DETAILS UPDATED ${finalData.name}`,
          null, // Will be set by controller if available
          details,
          {
            item_id: finalData.id,
            item_name: finalData.name,
            education_level: finalData.education_level,
            updated_fields: updatedFields,
            previous_data: currentItem,
            new_data: finalData,
          }
        );
      } catch (txError) {
        console.error("Failed to log transaction for item update:", txError);
      }

      return {
        success: true,
        data: updatedItemData || data,
        message: "Item updated successfully",
        notificationInfo,
      };
    } catch (error) {
      console.error("Update item error:", error);
      throw new Error(`Failed to update item: ${error.message}`);
    }
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(id) {
    try {
      const { data, error } = await supabase
        .from("items")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Item not found");
      return { success: true, message: "Item deleted successfully" };
    } catch (error) {
      console.error("Delete item error:", error);
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  /**
   * Adjust item stock
   */
  async adjustStock(id, adjustment, reason = "", io = null) {
    try {
      const { data: currentItem, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();
      if (fetchError) throw fetchError;
      if (!currentItem) throw new Error("Item not found");

      const wasOutOfStock =
        currentItem.stock === 0 || currentItem.status === "Out of Stock";
      const newStock = Math.max(0, currentItem.stock + adjustment);
      const isRestocked = wasOutOfStock && newStock > 0;

      const { data, error } = await supabase
        .from("items")
        .update({ stock: newStock })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      let notificationInfo = null;
      if (isRestocked) {
        console.log(
          `📦 Item restocked via adjustment: ${data.name} (${data.education_level})`
        );
        notificationInfo = await this.handleRestockNotifications(data, io);
      }

      return {
        success: true,
        data,
        message: `Stock adjusted successfully. ${reason}`,
        notificationInfo,
      };
    } catch (error) {
      console.error("Adjust stock error:", error);
      throw new Error(`Failed to adjust stock: ${error.message}`);
    }
  }

  /**
   * Get items statistics
   */
  async getStats() {
    try {
      const { data, error } = await supabase.rpc("get_items_stats");
      if (error) throw error;

      return {
        success: true,
        data: data[0] || {
          total_items: 0,
          above_threshold_items: 0,
          at_reorder_point_items: 0,
          critical_items: 0,
          out_of_stock_items: 0,
          total_value: 0,
        },
      };
    } catch (error) {
      console.error("Get items stats error:", error);
      throw new Error(`Failed to fetch items statistics: ${error.message}`);
    }
  }

  /**
   * Get low stock items (Critical and At Reorder Point)
   */
  async getLowStockItems() {
    try {
      const { data, error } = await supabase.rpc("get_low_stock_items");
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Get low stock items error:", error);
      throw new Error(`Failed to fetch low stock items: ${error.message}`);
    }
  }

  /**
   * Get available sizes for a product by name and education level
   */
  /**
   * Get available sizes for a product by name and education level
   */
  async getAvailableSizes(name, educationLevel) {
    try {
      // Use case-insensitive matching for name and education_level
      // This ensures we find items regardless of case differences
      const { data, error } = await supabase
        .from("items")
        .select("size, stock, status, id, note, price")
        .ilike("name", name) // Case-insensitive match
        .ilike("education_level", educationLevel) // Case-insensitive match
        .eq("is_active", true)
        .order("size", { ascending: true });
      
      console.log(`🔍 getAvailableSizes: Found ${data?.length || 0} items for "${name}" (${educationLevel})`);
      if (data && data.length > 0) {
        console.log(`📦 Sizes found:`, data.map(item => ({ size: item.size, stock: item.stock })));
      }

      if (error) throw error;

      const sizeMap = new Map();

      (data || []).forEach((item) => {
        // Check if item has JSON variations in note field
        let hasJsonVariations = false;
        if (item.note) {
          try {
            const parsedNote = JSON.parse(item.note);
            if (
              parsedNote &&
              parsedNote._type === "sizeVariations" &&
              Array.isArray(parsedNote.sizeVariations)
            ) {
              hasJsonVariations = true;

              // Process each variation from the JSON
              parsedNote.sizeVariations.forEach((variant) => {
                let variantSize = variant.size;

                // Normalization:
                // Admin saves sizes as "Small (S)", "Medium (M)" etc.
                // Frontend expects "Small", "Medium" to map to "S", "M".
                // We strip the abbreviation in parens if present.
                if (variantSize && typeof variantSize === "string") {
                  const match = variantSize.match(/^(.+?)\s*\((.+?)\)$/);
                  if (match) {
                    variantSize = match[1].trim();
                  }
                }
                const variantStock = Number(variant.stock) || 0;

                // Determine status based on variant stock
                let variantStatus = "Above Threshold";
                if (variantStock === 0) variantStatus = "Out of Stock";
                else if (variantStock <= 10) variantStatus = "Critical";
                else if (variantStock <= 20) variantStatus = "At Reorder Point";

                if (sizeMap.has(variantSize)) {
                  const existing = sizeMap.get(variantSize);
                  existing.stock += variantStock;
                  // Update status based on new combined stock
                  if (existing.stock === 0) existing.status = "Out of Stock";
                  else if (existing.stock <= 10) existing.status = "Critical";
                  else if (existing.stock <= 20)
                    existing.status = "At Reorder Point";
                  else existing.status = "Above Threshold";
                } else {
                  sizeMap.set(variantSize, {
                    size: variantSize,
                    stock: variantStock,
                    status: variantStatus,
                    id: item.id, // Use parent item ID
                    price: Number(variant.price) || Number(item.price) || 0,
                    isJsonVariant: true, // Flag to indicate this is from JSON
                  });
                }
              });
            }
          } catch (e) {
            // Ignore parse errors, treat as normal item
            console.warn("Failed to parse item note as JSON:", e);
          }
        }

        // If not processed as JSON variations, process as standard item row
        if (!hasJsonVariations) {
          if (item.size === "N/A" || !item.size) return;

          // Normalize size for consistent mapping (trim whitespace, but keep original case for display)
          const normalizedSize = item.size.trim();
          
          // Check if we already have this size (case-insensitive check)
          let existingSizeKey = null;
          for (const [key] of sizeMap.entries()) {
            if (key.toLowerCase().trim() === normalizedSize.toLowerCase()) {
              existingSizeKey = key;
              break;
            }
          }

          if (existingSizeKey) {
            // Combine with existing size entry
            const existing = sizeMap.get(existingSizeKey);
            existing.stock += item.stock;
            if (existing.stock === 0) existing.status = "Out of Stock";
            else if (existing.stock <= 10) existing.status = "Critical";
            else if (existing.stock <= 20) existing.status = "At Reorder Point";
            else existing.status = "Above Threshold";
          } else {
            // Add new size entry (use original size value for display)
            sizeMap.set(normalizedSize, {
              size: normalizedSize, // Keep original size format
              stock: item.stock,
              status: item.status,
              id: item.id,
              price: item.price,
            });
          }
        }
      });

      const sizes = Array.from(sizeMap.values()).map((item) => ({
        ...item,
        available: item.stock > 0,
        isPreOrder: item.stock === 0,
      }));

      // Sort sizes logically (S, M, L, etc.)
      const sizeOrder = {
        XS: 1,
        XSMALL: 1,
        "EXTRA SMALL": 1,
        S: 2,
        SMALL: 2,
        M: 3,
        MEDIUM: 3,
        L: 4,
        LARGE: 4,
        XL: 5,
        XLARGE: 5,
        "EXTRA LARGE": 5,
        XXL: 6,
        "2XL": 6,
        "2XLARGE": 6,
        XXLARGE: 6,
        "3XL": 7,
        "3XLARGE": 7,
      };

      sizes.sort((a, b) => {
        // Extract abbreviation if present (e.g. "Small (S)" -> "S")
        const getCleanSize = (s) => {
          if (!s) return "";
          const str = String(s).toUpperCase();
          // Try to extract content in parens
          const match = str.match(/\(([^)]+)\)/);
          if (match) return match[1].trim();
          return str.trim();
        };

        const cleanA = getCleanSize(a.size);
        const cleanB = getCleanSize(b.size);

        // Try direct lookup or fallback to default high number
        // Check for "XSMALL", "XS", etc.
        let orderA = sizeOrder[cleanA] || 99;
        let orderB = sizeOrder[cleanB] || 99;

        // If 99, try to see if it starts with known keys
        if (orderA === 99) {
          for (const k in sizeOrder) {
            if (cleanA.includes(k)) {
              orderA = sizeOrder[k];
              break;
            }
          }
        }
        if (orderB === 99) {
          for (const k in sizeOrder) {
            if (cleanB.includes(k)) {
              orderB = sizeOrder[k];
              break;
            }
          }
        }

        return orderA - orderB;
      });

      return { success: true, data: sizes };
    } catch (error) {
      console.error("Get available sizes error:", error);
      throw new Error(`Failed to fetch available sizes: ${error.message}`);
    }
  }

  /**
   * Handle restock notifications for pre-orders
   */
  async handleRestockNotifications(item, io = null) {
    try {
      console.log(`🔔 Checking for pre-orders to notify for: ${item.name}`);

      // Normalize size for matching
      let sizeToMatch = item.size;
      if (item.size) {
        const lower = item.size.toLowerCase();
        // Extract content from parens if any: "XSmall (XS)" -> "XS"
        const parenMatch = item.size.match(/\(([^)]+)\)/);
        if (parenMatch) {
          sizeToMatch = parenMatch[1].trim();
        } else {
          // Basic mapping
          if (lower === "xsmall" || lower === "extra small") sizeToMatch = "XS";
          else if (lower === "small") sizeToMatch = "S";
          else if (lower === "medium") sizeToMatch = "M";
          else if (lower === "large") sizeToMatch = "L";
          else if (lower === "xlarge" || lower === "extra large")
            sizeToMatch = "XL";
          else if (lower === "2xlarge" || lower === "xxl") sizeToMatch = "XXL";
        }
      }

      console.log(
        `🔍 Matching against size: ${sizeToMatch} (Original: ${item.size})`
      );

      const studentsWithPreOrders =
        await NotificationService.findStudentsWithPendingPreOrders(
          item.name,
          item.education_level,
          sizeToMatch || null
        );

      if (studentsWithPreOrders.length === 0) {
        console.log("ℹ️ No students to notify");
        return {
          notified: 0,
          converted: 0,
          total: 0,
          students: [],
          conversions: [],
        };
      }

      console.log(`📧 Notifying ${studentsWithPreOrders.length} students...`);
      const notificationResults = [];

      for (const student of studentsWithPreOrders) {
        try {
          // Create notification (manual conversion - student must click "Order" button)
          const notification =
            await NotificationService.createRestockNotification({
              studentId: student.studentId,
              itemName: item.name,
              educationLevel: item.education_level,
              size: student.item.size || item.size || null,
              orderNumber: student.orderNumber,
              inventoryId: item.id,
              orderConverted: false, // Manual conversion - student must order manually
            });

          if (io) {
            io.emit("items:restocked", {
              userId: student.studentId,
              notification: notification.data,
              item: {
                id: item.id,
                name: item.name,
                educationLevel: item.education_level,
                size: student.item.size || item.size || null,
                stock: item.stock,
              },
              order: {
                id: student.orderId,
                orderNumber: student.orderNumber,
                converted: false, // Manual conversion required
              },
            });
            console.log(
              `📡 Socket.IO: Emitted items:restocked to student ${student.studentId}`
            );
          }

          notificationResults.push({
            studentId: student.studentId,
            studentName: student.studentName,
            orderNumber: student.orderNumber,
            orderId: student.orderId,
            success: true,
          });
        } catch (error) {
          console.error(
            `Failed to create notification for student ${student.studentId}:`,
            error
          );
          notificationResults.push({
            studentId: student.studentId,
            studentName: student.studentName,
            orderNumber: student.orderNumber,
            orderId: student.orderId,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = notificationResults.filter((r) => r.success).length;
      console.log(
        `✅ Successfully notified ${successCount}/${studentsWithPreOrders.length} students`
      );
      console.log(
        `ℹ️ Students can now manually convert their pre-orders to regular orders when items are available`
      );

      return {
        notified: successCount,
        converted: 0, // No automatic conversions
        total: studentsWithPreOrders.length,
        students: notificationResults,
        conversions: [], // No conversions performed automatically
      };
    } catch (error) {
      console.error("Handle restock notifications error:", error);
      return { notified: 0, total: 0, students: [], error: error.message };
    }
  }
}

module.exports = new ItemsService();
