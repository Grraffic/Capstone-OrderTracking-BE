const supabase = require("../../config/supabase");
const { generateOrderReceiptQRData } = require("../../utils/qrCodeGenerator");
const isProduction = process.env.NODE_ENV === "production";

/**
 * Order Service
 * Handles all order-related database operations
 */
class OrderService {
  /**
   * Get all orders with optional filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Orders list with pagination info
   */
  async getOrders(filters = {}, page = 1, limit = 10) {
    try {
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      // Apply filters (but not search - we'll handle search separately)
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.order_type) {
        query = query.eq("order_type", filters.order_type);
      }

      if (filters.education_level) {
        query = query.eq("education_level", filters.education_level);
      }

      if (filters.student_id) {
        query = query.eq("student_id", filters.student_id);
      }

      let data, error, count;

      if (filters.search) {
        // Optimized search: Use database-level search for basic fields first
        // This is much more efficient than fetching all records
        const searchTerm = filters.search.trim();
        
        // Try database-level search first (faster)
        query = query.or(
          `order_number.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%,student_email.ilike.%${searchTerm}%`
        );
        
        // For item name search, we need to fetch and filter client-side
        // But limit the initial fetch to reduce memory usage
        const searchLimit = 500; // Reduced from 1000
        let searchQuery = query.limit(searchLimit);
        
        const { data: allData, error: allError } = await searchQuery;
        if (allError) throw allError;
        
        // Filter by ALL fields including item names (client-side for JSONB)
        const searchTermLower = searchTerm.toLowerCase();
        const allMatchingOrders = (allData || []).filter(order => {
          // Basic fields already filtered by DB, but double-check
          const matchesBasic = 
            (order.order_number && order.order_number.toLowerCase().includes(searchTermLower)) ||
            (order.student_name && order.student_name.toLowerCase().includes(searchTermLower)) ||
            (order.student_email && order.student_email.toLowerCase().includes(searchTermLower));
          
          if (matchesBasic) return true;
          
          // Check items JSONB array for item names and sizes
          let itemsArray = [];
          if (order.items && Array.isArray(order.items)) {
            itemsArray = order.items;
          } else if (typeof order.items === 'string') {
            try {
              const parsedItems = JSON.parse(order.items);
              if (Array.isArray(parsedItems)) {
                itemsArray = parsedItems;
              }
            } catch (e) {
              // Not valid JSON, skip
            }
          }
          
          // Search in item names and sizes
          return itemsArray.some(item => {
            const itemName = (item?.name || '').toLowerCase();
            const itemSize = (item?.size || '').toLowerCase();
            return itemName.includes(searchTermLower) || itemSize.includes(searchTermLower);
          });
        });
        
        count = allMatchingOrders.length;
        
        // Apply pagination to filtered results
        const from = (page - 1) * limit;
        const to = from + limit;
        data = allMatchingOrders.slice(from, to);
        error = null;
      } else {
        // No search, use normal pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
        const result = await query;
        data = result.data;
        error = result.error;
        count = result.count;
      }

      if (error) throw error;

      // Enhance orders with student profile data - optimized batch lookup
      let enhancedData = data;
      if (data && data.length > 0) {
        // Extract unique student IDs and emails
        const studentIds = [...new Set(data.filter(o => o.student_id).map(o => o.student_id))];
        const studentEmails = [...new Set(data.filter(o => o.student_email).map(o => o.student_email))];
        
        // Batch fetch users by ID and email in parallel
        const [usersByIdResult, usersByEmailResult] = await Promise.all([
          studentIds.length > 0
            ? supabase
                .from("users")
                .select("id, photo_url, avatar_url, name, email")
                .in("id", studentIds)
            : Promise.resolve({ data: [], error: null }),
          studentEmails.length > 0
            ? supabase
                .from("users")
                .select("id, email, photo_url, avatar_url, name")
                .in("email", studentEmails)
            : Promise.resolve({ data: [], error: null }),
        ]);
        
        // Create lookup maps
        const userMapById = {};
        const userMapByEmail = {};
        
        if (usersByIdResult.data) {
          usersByIdResult.data.forEach(u => userMapById[u.id] = u);
        }
        
        if (usersByEmailResult.data) {
          usersByEmailResult.data.forEach(u => userMapByEmail[u.email] = u);
        }
        
        // Map orders with student data (prefer ID match, fallback to email)
        enhancedData = data.map(order => ({
          ...order,
          student_data: userMapById[order.student_id] || userMapByEmail[order.student_email] || null
        }));
      }

      return {
        success: true,
        data: enhancedData,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error("Get orders error:", error);
      throw error;
    }
  }

  /**
   * Get single order by ID
   * @param {string} id - Order ID
   * @returns {Promise<Object>} - Order data
   */
  async getOrderById(id) {
    try {
      console.log(`🔍 Fetching order by ID: ${id}`);
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error(`❌ Error fetching order ${id}:`, error);
        throw error;
      }
      
      if (!data) {
        console.error(`❌ Order ${id} not found in database`);
        throw new Error("Order not found");
      }
      
      console.log(`✅ Order ${id} found:`, { 
        order_number: data.order_number, 
        order_type: data.order_type,
        status: data.status,
        student_id: data.student_id 
      });

      // Attach student data
      let enhancedOrder = data;
      if (data.student_id) {
        // Try precise match by ID first
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, photo_url, avatar_url, name, email")
          .eq("id", data.student_id)
          .maybeSingle();
          
        if (user) {
          enhancedOrder = { ...data, student_data: user };
        } else {
           // Fallback to email match
           const { data: userByEmail } = await supabase
            .from("users")
            .select("id, photo_url, avatar_url, name, email")
            .eq("email", data.student_email)
            .maybeSingle();
            
           if (userByEmail) {
             enhancedOrder = { ...data, student_data: userByEmail };
           }
        }
      }

      return {
        success: true,
        data: enhancedOrder,
      };
    } catch (error) {
      console.error("Get order by ID error:", error);
      throw error;
    }
  }

  /**
   * Get order by order number
   * @param {string} orderNumber - Order number
   * @returns {Promise<Object>} - Order data
   */
  async getOrderByNumber(orderNumber) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      // Attach student data
      let enhancedOrder = data;
      if (data.student_id) {
        // Try precise match by ID first
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, photo_url, avatar_url, name, email")
          .eq("id", data.student_id)
          .maybeSingle();
          
        if (user) {
          enhancedOrder = { ...data, student_data: user };
        } else {
           // Fallback to email match
           const { data: userByEmail } = await supabase
            .from("users")
            .select("id, photo_url, avatar_url, name, email")
            .eq("email", data.student_email)
            .maybeSingle();
            
           if (userByEmail) {
             enhancedOrder = { ...data, student_data: userByEmail };
           }
        }
      }

      return {
        success: true,
        data: enhancedOrder,
      };
    } catch (error) {
      console.error("Get order by number error:", error);
      throw error;
    }
  }

  /**
   * Create new order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} - Created order
   */
  async createOrder(orderData, io = null) {
    try {
      // Validate required fields
      const requiredFields = [
        "order_number",
        "student_name",
        "student_email",
        "education_level",
        "items",
        "total_amount",
      ];

      for (const field of requiredFields) {
        if (!orderData[field] && orderData[field] !== 0) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Set default order_type if not provided (for backward compatibility)
      if (!orderData.order_type) {
        orderData.order_type = "regular";
      }

      // Validate items array
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error("Order must contain at least one item");
      }

      // Generate QR code data if missing or null
      if (!orderData.qr_code_data) {
        console.log("QR code data missing, generating...");
        const qrCodeData = generateOrderReceiptQRData({
          orderNumber: orderData.order_number,
          studentId: orderData.student_id,
          studentName: orderData.student_name,
          studentEmail: orderData.student_email,
          items: orderData.items,
          educationLevel: orderData.education_level,
          totalAmount: orderData.total_amount,
          orderDate: new Date().toISOString(),
          status: orderData.status || "pending",
        });
        orderData.qr_code_data = qrCodeData;
        console.log("QR code data generated successfully");
      }

      // Step 1: Create the order
      const { data, error } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Step 2: Automatically reduce inventory for regular orders only
      // Pre-orders don't reduce inventory since items are already out of stock
      const inventoryUpdates = [];
      const items = orderData.items || [];
      const isPreOrder = orderData.order_type === "pre-order";

      if (!isPreOrder) {
        // Only reduce inventory for regular orders
        // Optimize: Batch fetch all potential items first to reduce queries
        const uniqueItemNames = [...new Set(items.map(i => i.name))];
        const itemLookupPromises = uniqueItemNames.map(itemName =>
          supabase
            .from("items")
            .select("*")
            .ilike("name", itemName)
            .eq("education_level", orderData.education_level)
            .eq("is_active", true)
        );
        
        const itemLookupResults = await Promise.all(itemLookupPromises);
        const itemLookupMap = new Map();
        uniqueItemNames.forEach((name, index) => {
          if (itemLookupResults[index].data) {
            itemLookupMap.set(name.toLowerCase(), itemLookupResults[index].data);
          }
        });
        
        // Process each item in the order
        for (const item of items) {
          try {
            // Find inventory item by name, education level, AND size
            // This ensures we reduce stock from the correct size variant
            const itemSize = item.size || "N/A";

            // Use pre-fetched items from batch lookup
            const potentialItems = itemLookupMap.get(item.name.toLowerCase()) || [];

            if (!potentialItems || potentialItems.length === 0) {
              console.error(
                `Inventory item not found: ${item.name} (Education Level: ${orderData.education_level})`
              );
              continue;
            }

            let inventoryItem = null;
            let isJsonVariant = false;
            let variantIndex = -1;

            // Check if any of the potential items match the size via JSON variants or direct column
            for (const pItem of potentialItems || []) {
              // Check 1: Is it a JSON variant item?
              if (pItem.note) {
                try {
                  const parsedNote = JSON.parse(pItem.note);
                  if (parsedNote && parsedNote._type === 'sizeVariations' && Array.isArray(parsedNote.sizeVariations)) {
                     // Find matching variant
                     const vIndex = parsedNote.sizeVariations.findIndex(v => {
                       // Flexible matching: check perfect match or abbreviation match
                        const vSize = v.size || "";
                        if (vSize === itemSize) return true;
                        return vSize.includes(itemSize) || itemSize.includes(vSize);
                     });
                     
                     if (vIndex !== -1) {
                       inventoryItem = pItem;
                       isJsonVariant = true;
                       variantIndex = vIndex;
                       break; // Found it
                     }
                  }
                } catch (e) {
                  // Not JSON
                }
              }
              
              // Check 2: Direct size match (legacy/standard row)
              if (!isJsonVariant) {
                 const dbSize = pItem.size || "N/A";
                 if (dbSize === itemSize || (itemSize === "N/A" && (!pItem.size || pItem.size === "N/A"))) {
                   inventoryItem = pItem;
                   break;
                 }
              }
            }

            if (!inventoryItem) {
              console.error(
                `Inventory item not found: ${item.name} (Size: ${itemSize}, Education Level: ${orderData.education_level})`
              );
              continue;
            }

            if (!isProduction) {
              console.log(
                `Found inventory item: ${item.name} (Size: ${itemSize}, Stock: ${inventoryItem.stock}, JSON: ${isJsonVariant})`
              );
            }

            let newStock = 0; // Total new stock for the row
            let previousStock = 0; // Previous stock for the specific variant
            
            if (isJsonVariant) {
               // Handle JSON Variant Update
               const parsedNote = JSON.parse(inventoryItem.note);
               const variant = parsedNote.sizeVariations[variantIndex];
               previousStock = Number(variant.stock) || 0;
               
               // Deduct from variant
               const newVariantStock = Math.max(0, previousStock - item.quantity);
               parsedNote.sizeVariations[variantIndex].stock = newVariantStock;
               
               // Recalculate total stock for the row
               newStock = parsedNote.sizeVariations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
               
               // Update DB
               const { data: updatedItem, error: updateError } = await supabase
                .from("items")
                .update({ 
                  stock: newStock,
                  note: JSON.stringify(parsedNote)
                })
                .eq("id", inventoryItem.id)
                .select()
                .single();
                
               if (updateError) {
                  throw updateError;
               }
               
               if (!isProduction) {
                 console.log(`Updated JSON variant inventory for ${item.name} size ${variant.size}: ${previousStock} -> ${newVariantStock}. Total row stock: ${newStock}`);
               }
               
               inventoryUpdates.push({
                item: item.name,
                size: variant.size,
                quantity: item.quantity,
                previousStock: previousStock,
                newStock: newVariantStock,
                success: true,
              });

            } else {
              // Handle Standard Row Update
               previousStock = inventoryItem.stock;
               newStock = Math.max(0, inventoryItem.stock - item.quantity);

              // Update inventory stock
              const { data: updatedItem, error: updateError } = await supabase
                .from("items")
                .update({ stock: newStock })
                .eq("id", inventoryItem.id)
                .select()
                .single();

              if (updateError) {
                console.error(
                  `Failed to update inventory for ${item.name}:`,
                  updateError
                );
                continue;
              }

              inventoryUpdates.push({
                item: item.name,
                size: itemSize,
                quantity: item.quantity,
                previousStock: previousStock,
                newStock: newStock,
                success: true,
              });

              if (!isProduction) {
                console.log(
                  `Inventory reduced: ${item.name} (Size: ${itemSize}) from ${previousStock} to ${newStock} (ordered: ${item.quantity})`
                );
              }
            }

          } catch (itemError) {
            console.error(`Error processing item ${item.name}:`, itemError);
            inventoryUpdates.push({
              item: item.name,
              quantity: item.quantity,
              success: false,
              error: itemError.message,
            });
          }
        }
      } else {
        if (!isProduction) {
          console.log("Pre-order detected - skipping inventory reduction");
        }
        inventoryUpdates.push({
          message: "Pre-order - inventory not reduced",
          orderType: "pre-order",
        });
      }

      // Log transaction for order creation
      try {
        const TransactionService = require("../../services/transaction.service");
        const itemCount = items.length;
        const details = `Order #${orderData.order_number} created with ${itemCount} item(s) by ${orderData.student_name} (${orderData.education_level})`;
        await TransactionService.logTransaction(
          "Order",
          "ORDER CREATED",
          orderData.student_id || null,
          details,
          {
            order_id: data.id,
            order_number: orderData.order_number,
            student_id: orderData.student_id,
            student_name: orderData.student_name,
            student_email: orderData.student_email,
            education_level: orderData.education_level,
            item_count: itemCount,
            total_amount: orderData.total_amount,
            order_type: orderData.order_type,
          }
        );
      } catch (txError) {
        // Don't fail order creation if transaction logging fails
        console.error("Failed to log transaction for order creation:", txError);
      }

      return {
        success: true,
        data,
        inventoryUpdates,
        message: "Order created successfully and inventory updated",
      };
    } catch (error) {
      console.error("Create order error:", error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} id - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(id, status) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Add timestamp for specific status changes
      if (status === "paid") {
        updates.payment_date = new Date().toISOString();
      } else if (status === "claimed") {
        updates.claimed_date = new Date().toISOString();
      }

      // Get order before update to capture previous status
      const { data: orderBeforeUpdate } = await supabase
        .from("orders")
        .select("status, order_number, student_id, student_name")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      // Log transaction for order status update
      try {
        const TransactionService = require("../../services/transaction.service");
        const action = status === "claimed" ? "ORDER CLAIMED" : "ORDER STATUS UPDATED";
        const details = `Order #${data.order_number} status changed from ${orderBeforeUpdate?.status || "unknown"} to ${status}${data.student_name ? ` for ${data.student_name}` : ""}`;
        await TransactionService.logTransaction(
          "Order",
          action,
          data.student_id || null,
          details,
          {
            order_id: data.id,
            order_number: data.order_number,
            previous_status: orderBeforeUpdate?.status,
            new_status: status,
            student_id: data.student_id,
            student_name: data.student_name,
          }
        );
      } catch (txError) {
        // Don't fail status update if transaction logging fails
        console.error("Failed to log transaction for order status update:", txError);
      }

      return {
        success: true,
        data,
        message: "Order status updated successfully",
      };
    } catch (error) {
      console.error("Update order status error:", error);
      throw error;
    }
  }

  /**
   * Update order
   * @param {string} id - Order ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrder(id, updates) {
    try {
      // Remove fields that shouldn't be updated directly
      const { id: _, created_at, ...allowedUpdates } = updates;
      allowedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("orders")
        .update(allowedUpdates)
        .eq("id", id)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        data,
        message: "Order updated successfully",
      };
    } catch (error) {
      console.error("Update order error:", error);
      throw error;
    }
  }

  /**
   * Delete order (soft delete)
   * @param {string} id - Order ID
   * @returns {Promise<Object>} - Success message
   */
  async deleteOrder(id) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Order not found");

      return {
        success: true,
        message: "Order deleted successfully",
      };
    } catch (error) {
      console.error("Delete order error:", error);
      throw error;
    }
  }

  /**
   * Get order statistics
   * @returns {Promise<Object>} - Order statistics
   */
  async getOrderStats() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("status, total_amount")
        .eq("is_active", true);

      if (error) throw error;

      const stats = {
        total_orders: data.length,
        pending_orders: data.filter((o) => o.status === "pending").length,
        paid_orders: data.filter((o) => o.status === "paid").length,
        claimed_orders: data.filter((o) => o.status === "claimed").length,
        total_revenue: data.reduce(
          (sum, o) => sum + parseFloat(o.total_amount || 0),
          0
        ),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Get order stats error:", error);
      throw error;
    }
  }

  /**
   * Convert a pre-order to a regular order when item becomes available
   * @param {string} orderId - Order ID
   * @param {string} itemName - Name of the item that was restocked
   * @param {string} size - Size of the item (optional)
   * @returns {Promise<Object>} - Updated order
   */
  async convertPreOrderToRegular(orderId, itemName, size = null) {
    try {
      console.log(
        `🔄 Converting pre-order ${orderId} to regular order for ${itemName}${
          size ? ` (Size: ${size})` : ""
        }`
      );

      // Step 1: Get the pre-order
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!order) throw new Error("Order not found");

      // Step 2: Verify it's a pre-order
      if (order.order_type !== "pre-order") {
        console.log(
          `⚠️ Order ${orderId} is not a pre-order, skipping conversion`
        );
        return {
          success: false,
          message: "Order is not a pre-order",
          data: order,
        };
      }

      // Step 3: Check if the order contains the restocked item
      const items = order.items || [];
      const matchingItem = items.find((item) => {
        const nameMatch = item.name === itemName;
        const sizeMatch = size ? item.size === size : true;
        return nameMatch && sizeMatch;
      });

      if (!matchingItem) {
        console.log(
          `⚠️ Order ${orderId} does not contain matching item ${itemName}${
            size ? ` (Size: ${size})` : ""
          }`
        );
        return {
          success: false,
          message: "Order does not contain the restocked item",
          data: order,
        };
      }

      // Step 4: Generate QR code data
      const qrCodeData = generateOrderReceiptQRData({
        orderNumber: order.order_number,
        studentId: order.student_id,
        studentName: order.student_name,
        items: order.items,
        educationLevel: order.education_level,
        status: "pending",
        created_at: order.created_at,
      });

      // Step 5: Update order to regular order
      const updates = {
        order_type: "regular",
        qr_code_data: qrCodeData,
        status: "pending", // Reset to pending for regular order processing
        updated_at: new Date().toISOString(),
      };

      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Step 6: Reduce inventory stock for the items (since it's now a regular order)
      const inventoryUpdates = [];
      for (const item of items) {
        try {
          // Find inventory item by name, education level, and size if specified
          // Find inventory item by name and education level
          const { data: inventoryItems, error: searchError } = await supabase
            .from("items")
            .select("*")
            .ilike("name", item.name)
            .eq("education_level", order.education_level)
            .eq("is_active", true)
            .limit(1);

          if (searchError) {
             console.error(`Failed to find inventory for ${item.name}:`, searchError);
            continue;
          }

          if (!inventoryItems || inventoryItems.length === 0) {
            console.error(`Inventory item not found: ${item.name}`);
            continue;
          }

          const inventoryItem = inventoryItems[0];
          let newStock = 0;
          let noteUpdate = null;
          let variantFound = false;

          // Check if item has JSON variations in note field
          if (inventoryItem.note) {
             try {
                const parsedNote = JSON.parse(inventoryItem.note);
                if (parsedNote && parsedNote._type === 'sizeVariations' && Array.isArray(parsedNote.sizeVariations)) {
                   
                   // Find the variant
                   const variantIndex = parsedNote.sizeVariations.findIndex(v => {
                      const vSize = v.size || "";
                      return vSize === item.size || vSize.includes(item.size) || (item.size && item.size.includes(vSize));
                   });

                   if (variantIndex !== -1) {
                      variantFound = true;
                      const variant = parsedNote.sizeVariations[variantIndex];
                      const currentVariantStock = Number(variant.stock) || 0;
                      
                      // Deduct from variant
                      const newVariantStock = Math.max(0, currentVariantStock - item.quantity);
                      parsedNote.sizeVariations[variantIndex].stock = newVariantStock;
                      
                      noteUpdate = JSON.stringify(parsedNote);
                      
                      // Also update total stock for compatibility
                      // Recalculate total stock from all variants
                      newStock = parsedNote.sizeVariations.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
                   }
                }
             } catch (e) {
                console.warn("Failed to parse item note for variant deduction:", e);
             }
          }

          // If no variant logic applied, fall back to standard deduction
          if (!variantFound) {
             // Only proceed if size matches (or item has no size/N/A)
             // We relax the size match here because we pulled by name/edu level. 
             // If the row relies on 'size' column for differentiation:
             if (inventoryItem.size !== 'N/A' && inventoryItem.size !== item.size && item.size !== 'N/A') {
                 // Try to find exact match row if we picked pending one
                 const { data: exactMatch } = await supabase
                    .from('items')
                    .select('*')
                    .ilike('name', item.name)
                    .eq('education_level', order.education_level)
                    .eq('size', item.size)
                    .eq('is_active', true)
                    .single();
                 
                 if (exactMatch) {
                    newStock = Math.max(0, exactMatch.stock - item.quantity);
                    // Update exact match
                    await supabase.from('items').update({ stock: newStock }).eq('id', exactMatch.id);
                    // Continue to next item
                    continue; 
                 }
             }
             
             newStock = Math.max(0, inventoryItem.stock - item.quantity);
          }

          // Update inventory stock (and note if applicable)
          const updatePayload = { stock: newStock };
          if (noteUpdate) {
             updatePayload.note = noteUpdate;
          }

          const { data: updatedItem, error: updateItemError } = await supabase
            .from("items")
            .update(updatePayload)
            .eq("id", inventoryItem.id)
            .select()
            .single();

          if (updateItemError) {
            console.error(
              `Failed to update inventory for ${item.name}:`,
              updateItemError
            );
            continue;
          }

          inventoryUpdates.push({
            item: item.name,
            size: item.size || "N/A",
            quantity: item.quantity,
            previousStock: inventoryItem.stock,
            newStock: newStock,
            success: true,
          });

          console.log(
            `Inventory reduced: ${item.name}${
              item.size ? ` (Size: ${item.size})` : ""
            } from ${inventoryItem.stock} to ${newStock} (ordered: ${
              item.quantity
            })`
          );
        } catch (itemError) {
          console.error(`Error processing item ${item.name}:`, itemError);
          inventoryUpdates.push({
            item: item.name,
            quantity: item.quantity,
            success: false,
            error: itemError.message,
          });
        }
      }

      console.log(
        `✅ Successfully converted pre-order ${orderId} to regular order`
      );

      return {
        success: true,
        data: updatedOrder,
        inventoryUpdates,
        message: "Pre-order converted to regular order successfully",
      };
    } catch (error) {
      console.error("Convert pre-order to regular error:", error);
      throw new Error(
        `Failed to convert pre-order to regular order: ${error.message}`
      );
    }
  }
}

module.exports = new OrderService();
