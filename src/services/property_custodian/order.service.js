const supabase = require("../../config/supabase");
const { generateOrderReceiptQRData } = require("../../utils/qrCodeGenerator");
const { getMaxQuantityForItem, normalizeItemName, resolveItemKey } = require("../../config/itemMaxOrder");
const { getStudentRowById } = require("../profileResolver.service");
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
      } else if (filters.student_id) {
        // For students, return ALL their orders including claimed/completed
        // Frontend will filter them into appropriate tabs
        // Only exclude cancelled orders for students
        // This ensures claimed orders appear in the "Claimed Orders" section
        // This matches what finance/accounting sees - all claimed orders should be visible to students
        // IMPORTANT: Some orders may have student_id=null (legacy data), so we need to also match by student_email
        // if provided, or handle null student_id cases
        query = query.neq("status", "cancelled");
        console.log(`📦 OrderService: Fetching all orders for student ${filters.student_id} (excluding cancelled)`);
        console.log(`📦 OrderService: This should include all claimed orders visible in finance/accounting`);
        
        // If student_email is provided, also match orders with null student_id by email
        // This handles legacy orders that don't have student_id set
        if (filters.student_email) {
          console.log(`📦 OrderService: Also matching orders with null student_id by email: ${filters.student_email}`);
          // Use .or() to match either by student_id OR (null student_id AND matching email)
          query = query.or(`student_id.eq.${filters.student_id},and(student_id.is.null,student_email.eq.${filters.student_email})`);
        } else {
          // Only match by student_id, but also include orders with null student_id if we can't match by email
          // For now, just match by student_id - we'll handle null cases separately if needed
          query = query.eq("student_id", filters.student_id);
        }
        
        // Diagnostic: First check ALL claimed orders in database (like Finance/Accounting sees)
        const { data: allClaimedOrders, error: claimedError } = await supabase
          .from("orders")
          .select("id, order_number, status, student_id, student_name, created_at, claimed_date, is_active")
          .eq("is_active", true)
          .in("status", ["claimed", "completed"]);
        
        console.log(`📊 OrderService: Finance/Accounting view - Total claimed/completed orders in database: ${allClaimedOrders?.length || 0}`);
        if (allClaimedOrders && allClaimedOrders.length > 0) {
          console.log(`📊 OrderService: Claimed orders student_id breakdown:`, 
            allClaimedOrders.reduce((acc, o) => {
              const sid = o.student_id || 'NULL';
              acc[sid] = (acc[sid] || 0) + 1;
              return acc;
            }, {})
          );
          console.log(`📊 OrderService: Sample claimed orders:`, allClaimedOrders.slice(0, 6).map(o => ({
            order_number: o.order_number,
            student_id: o.student_id,
            student_name: o.student_name,
            status: o.status
          })));
        }
        
        // Diagnostic: Check ALL orders (not just claimed) for this specific student
        const { data: allOrdersCheck, error: allOrdersError } = await supabase
          .from("orders")
          .select("id, order_number, status, student_id, created_at, claimed_date, is_active")
          .eq("student_id", filters.student_id);
        
        console.log(`📊 OrderService: Database diagnostic - Total orders for student ${filters.student_id}: ${allOrdersCheck?.length || 0}`);
        if (allOrdersCheck && allOrdersCheck.length > 0) {
          const activeOrders = allOrdersCheck.filter(o => o.is_active === true);
          const inactiveOrders = allOrdersCheck.filter(o => o.is_active !== true);
          console.log(`📊 OrderService: Active orders: ${activeOrders.length}, Inactive orders: ${inactiveOrders.length}`);
          
          const statusBreakdown = activeOrders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          }, {});
          console.log(`📊 OrderService: Active order status breakdown:`, statusBreakdown);
          
          const claimedOrders = activeOrders.filter(o => o.status === "claimed" || o.status === "completed");
          if (claimedOrders.length > 0) {
            console.log(`📊 OrderService: Found ${claimedOrders.length} claimed/completed orders:`);
            claimedOrders.forEach(order => {
              console.log(`  - Order #${order.order_number}: status=${order.status}, claimed_date=${order.claimed_date || 'N/A'}, is_active=${order.is_active}`);
            });
          }
          
          // Show sample orders
          console.log(`📊 OrderService: Sample orders (first 5):`, activeOrders.slice(0, 5).map(o => ({
            order_number: o.order_number,
            status: o.status,
            is_active: o.is_active,
            student_id: o.student_id
          })));
        } else if (allOrdersError) {
          console.error(`❌ OrderService: Error checking all orders:`, allOrdersError);
        } else {
          console.log(`⚠️ OrderService: No orders found in database for student ${filters.student_id}`);
        }
      } else {
        // For admin/property custodian, only show active order statuses by default
        // Orders tab should only show: pending, processing, ready, payment_pending
        // Exclude: cancelled (voided/unclaimed), claimed, completed
        // These excluded statuses should only appear in their respective tabs
        query = query.in("status", ["pending", "processing", "ready", "payment_pending"]);
      }

      if (filters.order_type) {
        query = query.eq("order_type", filters.order_type);
      }

      if (filters.education_level) {
        query = query.eq("education_level", filters.education_level);
      }

      // Note: student_id filter is already applied above (line 30-50) for students with email fallback
      // Only apply here if it wasn't already applied (for non-student queries)
      if (filters.student_id && !filters.student_email) {
        // Apply student_id filter - ensure it's a string match
        const studentIdStr = String(filters.student_id).trim();
        query = query.eq("student_id", studentIdStr);
        console.log(`📦 OrderService: Applied student_id filter: "${studentIdStr}" (type: ${typeof filters.student_id})`);
      }
      
      // student_email filter is handled in the student_id section above with .or() query

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
          // Safety check: Exclude cancelled, claimed, and completed orders when no status filter
          // Orders tab should only show: pending, processing, ready, payment_pending
          if (!filters.status) {
            const status = order.status?.toLowerCase();
            const activeStatuses = ["pending", "processing", "ready", "payment_pending"];
            if (!activeStatuses.includes(status)) {
              return false;
            }
          }
          
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
        
        // Diagnostic logging for student orders
        if (filters.student_id) {
          console.log(`📊 OrderService: Query result for student ${filters.student_id}:`);
          console.log(`  - Total count from database: ${count}`);
          console.log(`  - Orders returned in this page: ${data?.length || 0}`);
          console.log(`  - Page: ${page}, Limit: ${limit}`);
          
          if (data && data.length > 0) {
            const statusBreakdown = data.reduce((acc, o) => {
              acc[o.status] = (acc[o.status] || 0) + 1;
              return acc;
            }, {});
            console.log(`  - Status breakdown:`, statusBreakdown);
            
            const claimedInResults = data.filter(o => o.status === "claimed" || o.status === "completed");
            if (claimedInResults.length > 0) {
              console.log(`✅ OrderService: Found ${claimedInResults.length} claimed/completed orders in results:`, claimedInResults.map(o => ({
                order_number: o.order_number,
                status: o.status,
                claimed_date: o.claimed_date,
                student_id: o.student_id
              })));
            } else {
              console.log(`⚠️ OrderService: No claimed orders in this page's results`);
            }
          } else {
            console.log(`⚠️ OrderService: Query returned 0 orders for student ${filters.student_id}`);
            console.log(`⚠️ OrderService: This might indicate:`);
            console.log(`  1. No orders exist for this student_id`);
            console.log(`  2. All orders are marked as is_active=false`);
            console.log(`  3. All orders have status='cancelled' (which is excluded)`);
            console.log(`  4. student_id mismatch between orders and user`);
          }
          
          // Check if there are more pages
          if (count > (data?.length || 0)) {
            console.log(`⚠️ OrderService: There are ${count} total orders but only ${data?.length || 0} returned (pagination limit)`);
            console.log(`⚠️ OrderService: Consider increasing limit or fetching additional pages`);
          }
        }
      }

      if (error) throw error;

      // Enhance orders with student profile data - optimized batch lookup
      let enhancedData = data;
      if (data && data.length > 0) {
        // Extract unique student IDs and emails
        const studentIds = [...new Set(data.filter(o => o.student_id).map(o => o.student_id))];
        const studentEmails = [...new Set(data.filter(o => o.student_email).map(o => o.student_email))];
        
        // Batch fetch students by ID and email (after migration orders.student_id = students.id)
        const [studentsByIdResult, studentsByEmailResult] = await Promise.all([
          studentIds.length > 0
            ? supabase.from("students").select("id, name, email").in("id", studentIds)
            : Promise.resolve({ data: [], error: null }),
          studentEmails.length > 0
            ? supabase.from("students").select("id, email, name").in("email", studentEmails)
            : Promise.resolve({ data: [], error: null }),
        ]);
        const userMapById = {};
        const userMapByEmail = {};
        if (studentsByIdResult.data) {
          studentsByIdResult.data.forEach((u) => {
            userMapById[u.id] = { ...u, photo_url: null, avatar_url: null };
          });
        }
        if (studentsByEmailResult.data) {
          studentsByEmailResult.data.forEach((u) => {
            userMapByEmail[u.email] = { ...u, photo_url: null, avatar_url: null };
          });
        }
        // Fallback: legacy orders may have user id in student_id before full migration
        const missingIds = studentIds.filter((id) => !userMapById[id]);
        if (missingIds.length > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, photo_url, avatar_url, name, email")
            .in("id", missingIds);
          if (usersData) usersData.forEach((u) => (userMapById[u.id] = u));
        }
        enhancedData = data.map((order) => ({
          ...order,
          student_data: userMapById[order.student_id] || userMapByEmail[order.student_email] || null,
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

      // Attach student data (students table first, fallback to users)
      let enhancedOrder = data;
      if (data.student_id) {
        const studentRow = await getStudentRowById(data.student_id);
        if (studentRow) {
          enhancedOrder = {
            ...data,
            student_data: {
              id: studentRow.id,
              name: studentRow.name,
              email: studentRow.email,
              photo_url: null,
              avatar_url: null,
            },
          };
        } else {
          const { data: user } = await supabase
            .from("users")
            .select("id, photo_url, avatar_url, name, email")
            .eq("id", data.student_id)
            .maybeSingle();
          if (user) {
            enhancedOrder = { ...data, student_data: user };
          } else {
            const { data: userByEmail } = await supabase
              .from("users")
              .select("id, photo_url, avatar_url, name, email")
              .eq("email", data.student_email)
              .maybeSingle();
            if (userByEmail) enhancedOrder = { ...data, student_data: userByEmail };
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

      // Attach student data (students table first, fallback to users)
      let enhancedOrder = data;
      if (data.student_id) {
        const studentRow = await getStudentRowById(data.student_id);
        if (studentRow) {
          enhancedOrder = {
            ...data,
            student_data: {
              id: studentRow.id,
              name: studentRow.name,
              email: studentRow.email,
              photo_url: null,
              avatar_url: null,
            },
          };
        } else {
          const { data: user } = await supabase
            .from("users")
            .select("id, photo_url, avatar_url, name, email")
            .eq("id", data.student_id)
            .maybeSingle();
          if (user) enhancedOrder = { ...data, student_data: user };
          else {
            const { data: userByEmail } = await supabase
              .from("users")
              .select("id, photo_url, avatar_url, name, email")
              .eq("email", data.student_email)
              .maybeSingle();
            if (userByEmail) enhancedOrder = { ...data, student_data: userByEmail };
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

      // Enforce system-admin limits: total_item_limit and order_lockout_period (students table first)
      const studentId = orderData.student_id || null;
      const studentEmail = (orderData.student_email || "").trim();
      let userRow = null;
      let userErr = null;
      if (studentId || studentEmail) {
        const userFields =
          "total_item_limit, total_item_limit_set_at, order_lockout_period, order_lockout_unit, education_level, student_type, gender";
        if (studentId) {
          userRow = await getStudentRowById(studentId);
          if (!userRow) {
            const r = await supabase.from("users").select(userFields).eq("id", studentId).maybeSingle();
            userRow = r.data;
            userErr = r.error;
          }
        } else {
          const r = await supabase.from("students").select(userFields).eq("email", studentEmail).maybeSingle();
          userRow = r.data;
          userErr = r.error;
          if (!userRow) {
            const r2 = await supabase.from("users").select("id, " + userFields).eq("email", studentEmail).maybeSingle();
            userRow = r2.data;
            userErr = r2.error;
          }
        }
        if (!userErr && userRow) {
          const rawMaxItems = userRow.total_item_limit;
          const studentType = (userRow.student_type || "new").toLowerCase();
          const baseMaxItems =
            studentType === "new" ? 8 :
            studentType === "old" ? 2 :
            null;
          // Admin override (rawMaxItems) wins; otherwise fall back to derived baseMaxItems.
          const maxItems =
            rawMaxItems != null && Number(rawMaxItems) > 0
              ? Number(rawMaxItems)
              : baseMaxItems;
          const lockoutPeriod = userRow.order_lockout_period;
          const lockoutUnit = userRow.order_lockout_unit;

          if (maxItems == null || Number(maxItems) <= 0) {
            throw new Error(
              "Your order limit has not been set by the administration. Please contact your school administrator to set your Total Item Limit before placing an order."
            );
          }

          // total_item_limit = number of distinct item types (slots). Only placed orders count; cart does not.
          // Slots are reduced when the student places an order, not when items are in the cart.
          if (maxItems != null && Number(maxItems) > 0) {
            const slotKeys = new Set();
            for (const item of orderData.items || []) {
              const key = resolveItemKey((item.name || "").trim());
              if (key) slotKeys.add(key);
            }
            const slotCount = slotKeys.size;

            const orParts = [];
            if (studentId) orParts.push(`student_id.eq.${studentId}`);
            if (studentEmail) orParts.push(`student_email.eq.${studentEmail}`);
            let slotsUsedFromPlacedOrders = 0;
            if (orParts.length > 0) {
              const placedStatuses = ["pending", "paid", "claimed", "processing", "ready", "payment_pending", "completed"];
              const { data: placedOrders } = await supabase
                .from("orders")
                .select("items")
                .eq("is_active", true)
                .in("status", placedStatuses)
                .or(orParts.join(","));
              const placedSlotKeys = new Set();
              for (const row of placedOrders || []) {
                const orderItems = Array.isArray(row.items) ? row.items : [];
                for (const it of orderItems) {
                  let key = resolveItemKey((it.name || "").trim());
                  if (!key && (it.name || "").trim()) {
                    const lower = (it.name || "").trim().toLowerCase();
                    if (lower.includes("logo patch")) key = "logo patch";
                  }
                  if (key && typeof key === "string" && key.toLowerCase().includes("logo patch")) key = "logo patch";
                  if (key) placedSlotKeys.add(key);
                }
              }
              slotsUsedFromPlacedOrders = placedSlotKeys.size;
            }
            const slotsLeftForThisOrder = Math.max(0, Number(maxItems) - slotsUsedFromPlacedOrders);
            if (slotCount > slotsLeftForThisOrder) {
              throw new Error(
                `Order exceeds your item type limit. You have ${slotsLeftForThisOrder} item type${slotsLeftForThisOrder !== 1 ? "s" : ""} left for this order (max ${maxItems} total; ${slotsUsedFromPlacedOrders} already used in placed orders). This order has ${slotCount}. Only placed orders count toward the limit—cart does not.`
              );
            }
          }

          if (lockoutPeriod != null && Number(lockoutPeriod) > 0 && maxItems != null && Number(maxItems) > 0) {
            const orParts = [];
            if (studentId) orParts.push(`student_id.eq.${studentId}`);
            if (studentEmail) orParts.push(`student_email.eq.${studentEmail}`);
            if (orParts.length > 0) {
              const { data: lastOrder } = await supabase
                .from("orders")
                .select("created_at, items")
                .eq("is_active", true)
                .or(orParts.join(","))
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lastOrder && lastOrder.created_at) {
                // Lockout applies only when the last order used the full Total Item Limit (slots).
                // If the last order had fewer than maxItems item types, the student can place another order.
                const lastOrderSlotKeys = new Set();
                for (const item of Array.isArray(lastOrder.items) ? lastOrder.items : []) {
                  const key = resolveItemKey((item.name || "").trim());
                  if (key) lastOrderSlotKeys.add(key);
                }
                const lastOrderSlotCount = lastOrderSlotKeys.size;
                const usedFullAllowance = lastOrderSlotCount >= Number(maxItems);

                if (usedFullAllowance) {
                  const lastDate = new Date(lastOrder.created_at);
                  const now = new Date();
                  const monthsPerAcademicYear = 10;
                  const lockoutMonths =
                    (lockoutUnit === "academic_years"
                      ? Number(lockoutPeriod) * monthsPerAcademicYear
                      : Number(lockoutPeriod));
                  const lockoutEnd = new Date(lastDate);
                  lockoutEnd.setMonth(lockoutEnd.getMonth() + lockoutMonths);
                  if (now < lockoutEnd) {
                    const unitLabel =
                      lockoutUnit === "academic_years"
                        ? "academic year(s)"
                        : "month(s)";
                    throw new Error(
                      `You cannot place another order until ${lockoutEnd.toLocaleDateString()}. Order lockout period is ${lockoutPeriod} ${unitLabel}.`
                    );
                  }
                }
              }
            }
          }

          // Per-item max enforcement: (current order + existing placed orders) must not exceed segment max
          const educationLevelForSegment =
            (userRow.education_level === "Preschool" ||
            userRow.education_level === "Prekindergarten"
              ? "Kindergarten"
              : userRow.education_level) || orderData.education_level || null;
          // studentType already derived earlier in this block
          const gender = userRow.gender || null;

          // Sum quantities in this order by resolved item key
          const totalsByItem = {};
          for (const item of orderData.items || []) {
            const key = resolveItemKey(item.name || "");
            if (!key) continue;
            totalsByItem[key] = (totalsByItem[key] || 0) + (Number(item.quantity) || 0);
          }

          // Sum quantities already in placed orders for this student (pending, paid, processing, ready, etc.)
          // Exclude "claimed" and "completed" - once an order is claimed, the student can order that item again
          const placedStatuses = ["pending", "paid", "processing", "ready", "payment_pending"];
          const orParts = [];
          if (studentId) orParts.push(`student_id.eq.${studentId}`);
          if (studentEmail) orParts.push(`student_email.eq.${studentEmail}`);
          let alreadyOrderedByItem = {};
          if (orParts.length > 0) {
            const { data: placedOrders } = await supabase
              .from("orders")
              .select("items")
              .eq("is_active", true)
              .in("status", placedStatuses)
              .or(orParts.join(","));
            for (const row of placedOrders || []) {
              const orderItems = Array.isArray(row.items) ? row.items : [];
              for (const it of orderItems) {
                const rawName = (it.name || "").trim();
                let key = resolveItemKey(rawName);
                if (!key && rawName && rawName.toLowerCase().includes("jogging pants")) key = "jogging pants";
                if (!key) continue;
                alreadyOrderedByItem[key] =
                  (alreadyOrderedByItem[key] || 0) + (Number(it.quantity) || 0);
              }
            }
          }

          for (const [itemKey, totalQty] of Object.entries(totalsByItem)) {
            const max = getMaxQuantityForItem(
              itemKey,
              educationLevelForSegment,
              studentType,
              gender
            );
            const alreadyOrdered = alreadyOrderedByItem[itemKey] || 0;
            const totalUsed = alreadyOrdered + totalQty;
            if (totalUsed > max) {
              throw new Error(
                `You have already ordered ${alreadyOrdered} of this item. Adding ${totalQty} would exceed the maximum (${max}) per student.`
              );
            }
          }
        }
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

      // Step 1: Create the order (student_confirmed_at = null until student confirms within claim window)
      if (orderData.student_confirmed_at === undefined) {
        orderData.student_confirmed_at = null;
      }
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
        // Fetch items that match student's education level OR "All Education Levels" (e.g. Logo Patch, ID Lace)
        const { data: allItems, error: itemsError } = await supabase
          .from("items")
          .select("*")
          .or(`education_level.eq."${orderData.education_level}",education_level.eq."All Education Levels"`)
          .eq("is_active", true);

        if (itemsError) throw itemsError;

        const itemLookupMap = new Map();
        for (const row of allItems || []) {
          const key = (row.name || "").toLowerCase();
          if (!itemLookupMap.has(key)) itemLookupMap.set(key, []);
          itemLookupMap.get(key).push(row);
        }

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
   * Restore inventory for a cancelled order (add quantities back to items table).
   * Only runs for regular orders; pre-orders did not reduce inventory.
   * @param {Object} order - Order with items, education_level, order_type
   * @returns {Promise<void>}
   */
  async restoreInventoryForOrder(order) {
    if (!order || order.order_type === "pre-order") return;

    const items = order.items || [];
    if (items.length === 0) return;

    // Include items for student's level OR "All Education Levels" (e.g. Logo Patch)
    const { data: allItems, error: itemsError } = await supabase
      .from("items")
      .select("*")
      .or(`education_level.eq."${order.education_level}",education_level.eq."All Education Levels"`)
      .eq("is_active", true);

    if (itemsError) {
      console.error("restoreInventoryForOrder: failed to fetch items", itemsError);
      return;
    }

    const itemLookupMap = new Map();
    for (const row of allItems || []) {
      const key = (row.name || "").toLowerCase();
      if (!itemLookupMap.has(key)) itemLookupMap.set(key, []);
      itemLookupMap.get(key).push(row);
    }

    for (const item of items) {
      try {
        const itemSize = item.size || "N/A";
        const potentialItems = itemLookupMap.get((item.name || "").toLowerCase()) || [];

        if (!potentialItems.length) {
          console.error(
            `restoreInventoryForOrder: item not found ${item.name} (Education Level: ${order.education_level})`
          );
          continue;
        }

        let inventoryItem = null;
        let isJsonVariant = false;
        let variantIndex = -1;

        for (const pItem of potentialItems) {
          if (pItem.note) {
            try {
              const parsedNote = JSON.parse(pItem.note);
              if (parsedNote && parsedNote._type === "sizeVariations" && Array.isArray(parsedNote.sizeVariations)) {
                const vIndex = parsedNote.sizeVariations.findIndex((v) => {
                  const vSize = v.size || "";
                  if (vSize === itemSize) return true;
                  return vSize.includes(itemSize) || itemSize.includes(vSize);
                });
                if (vIndex !== -1) {
                  inventoryItem = pItem;
                  isJsonVariant = true;
                  variantIndex = vIndex;
                  break;
                }
              }
            } catch (e) {
              // Not JSON
            }
          }
          if (!inventoryItem) {
            const dbSize = pItem.size || "N/A";
            if (dbSize === itemSize || (itemSize === "N/A" && (!pItem.size || pItem.size === "N/A"))) {
              inventoryItem = pItem;
              break;
            }
          }
        }

        if (!inventoryItem) {
          console.error(
            `restoreInventoryForOrder: item not found ${item.name} (Size: ${itemSize}, Education Level: ${order.education_level})`
          );
          continue;
        }

        const quantity = Number(item.quantity) || 0;
        if (quantity <= 0) continue;

        if (isJsonVariant) {
          const parsedNote = JSON.parse(inventoryItem.note);
          const variant = parsedNote.sizeVariations[variantIndex];
          const previousStock = Number(variant.stock) || 0;
          const newVariantStock = previousStock + quantity;
          parsedNote.sizeVariations[variantIndex].stock = newVariantStock;
          const newStock = parsedNote.sizeVariations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

          const { error: updateError } = await supabase
            .from("items")
            .update({ stock: newStock, note: JSON.stringify(parsedNote) })
            .eq("id", inventoryItem.id);

          if (updateError) {
            console.error(`restoreInventoryForOrder: failed to update ${item.name} (JSON variant):`, updateError);
          } else if (!isProduction) {
            console.log(
              `Restored inventory: ${item.name} size ${variant.size} +${quantity} (${previousStock} -> ${newVariantStock})`
            );
          }
        } else {
          const previousStock = inventoryItem.stock;
          const newStock = previousStock + quantity;

          const { error: updateError } = await supabase
            .from("items")
            .update({ stock: newStock })
            .eq("id", inventoryItem.id);

          if (updateError) {
            console.error(`restoreInventoryForOrder: failed to update ${item.name}:`, updateError);
          } else if (!isProduction) {
            console.log(
              `Restored inventory: ${item.name} (Size: ${itemSize}) +${quantity} (${previousStock} -> ${newStock})`
            );
          }
        }
      } catch (itemError) {
        console.error(`restoreInventoryForOrder: error processing item ${item.name}:`, itemError);
      }
    }
  }

  /**
   * Update order status
   * @param {string} id - Order ID
   * @param {string} status - New status
   * @param {string} [optionalNote] - Optional note (e.g. for auto-void reason when status is 'cancelled')
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(id, status, optionalNote) {
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

      if (status === "cancelled" && optionalNote) {
        updates.notes = optionalNote;
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

      // When order is cancelled, restore inventory (regular orders only)
      if (status === "cancelled") {
        try {
          const { data: fullOrder } = await supabase
            .from("orders")
            .select("id, items, education_level, order_type")
            .eq("id", id)
            .eq("is_active", true)
            .single();
          if (fullOrder) {
            await this.restoreInventoryForOrder(fullOrder);
          }
        } catch (restoreErr) {
          console.error("Failed to restore inventory for cancelled order:", restoreErr);
          // Do not rethrow; status was already updated
        }
      }

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

  /** Number of unclaimed (auto-voided) strikes before blocking the student. */
  static UNCLAIMED_VOID_STRIKES_BEFORE_BLOCK = 3;

  /**
   * Increment student's unclaimed void count (strike). After 3 strikes, set max_items_per_order to 0 (block).
   * Only called from void-unclaimed code paths. Does not run on manual/admin cancel.
   * @param {Object} order - Order with student_id and/or student_email
   * @returns {Promise<void>}
   */
  async incrementVoidStrikeAndBlockIfNeeded(order) {
    const studentId = order?.student_id || null;
    const studentEmail = (order?.student_email || "").trim();
    if (!studentId && !studentEmail) return;
    const strikesBeforeBlock = OrderService.UNCLAIMED_VOID_STRIKES_BEFORE_BLOCK;
    try {
      let targetId = studentId;
      let table = "students";
      if (!targetId && studentEmail) {
        const { data: studentRow } = await supabase.from("students").select("id").eq("email", studentEmail).maybeSingle();
        if (studentRow) {
          targetId = studentRow.id;
        }
      }
      if (!targetId) return;

      const { data: row, error: fetchErr } = await supabase
        .from(table)
        .select("unclaimed_void_count")
        .eq("id", targetId)
        .single();
      if (fetchErr) {
        console.error("incrementVoidStrikeAndBlockIfNeeded: fetch failed", fetchErr);
        return;
      }
      const current = Number(row?.unclaimed_void_count) || 0;
      const newCount = current + 1;
      const updatePayload = {
        unclaimed_void_count: newCount,
        updated_at: new Date().toISOString(),
      };
      if (newCount >= strikesBeforeBlock) {
        updatePayload.total_item_limit = 0;
      }
      const { error } = await supabase.from(table).update(updatePayload).eq("id", targetId);
      if (error) console.error("incrementVoidStrikeAndBlockIfNeeded: update failed", error);
    } catch (err) {
      console.error("incrementVoidStrikeAndBlockIfNeeded:", err);
    }
  }

  /**
   * Void unclaimed orders older than the given number of days.
   * Sets status to 'cancelled' and restores inventory (via updateOrderStatus).
   * @param {number} [days=7] - Number of days after which to void unclaimed orders
   * @returns {Promise<{ voidedCount: number, orderIds: string[] }>}
   */
  async voidUnclaimedOrdersOlderThanDays(days = 7) {
    const claimableStatuses = ["pending", "paid", "processing", "ready", "payment_pending"];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, student_id, student_email")
      .eq("is_active", true)
      .in("status", claimableStatuses)
      .lt("created_at", cutoffIso);

    if (error) {
      console.error("voidUnclaimedOrdersOlderThanDays: query error", error);
      return { voidedCount: 0, orderIds: [] };
    }

    const orderIds = (orders || []).map((o) => o.id);
    const note = `Auto-voided: not claimed within ${days} day(s).`;

    for (const order of orders || []) {
      try {
        await this.updateOrderStatus(order.id, "cancelled", note);
        await this.incrementVoidStrikeAndBlockIfNeeded(order);
        if (!isProduction) {
          console.log(`Auto-voided order ${order.order_number || order.id} (older than ${days} days)`);
        }
      } catch (err) {
        console.error(`voidUnclaimedOrdersOlderThanDays: failed to void order ${order.id}:`, err);
      }
    }

    if (orderIds.length > 0) {
      console.log(`Auto-void job: voided ${orderIds.length} order(s) older than ${days} days`);
    }

    return { voidedCount: orderIds.length, orderIds };
  }

  /**
   * Void unclaimed orders older than the given number of minutes (for testing).
   * Same as days but with minute cutoff. Does not check student_confirmed_at.
   * @param {number} minutes - Number of minutes after which to void unclaimed orders
   * @returns {Promise<{ voidedCount: number, orderIds: string[] }>}
   */
  async voidUnclaimedOrdersOlderThanMinutes(minutes) {
    const claimableStatuses = ["pending", "paid", "processing", "ready", "payment_pending"];
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutes);
    const cutoffIso = cutoff.toISOString();

    let query = supabase
      .from("orders")
      .select("id, order_number, student_id, student_email")
      .eq("is_active", true)
      .in("status", claimableStatuses)
      .lt("created_at", cutoffIso);

    const { data: orders, error } = await query;
    if (error) {
      console.error("voidUnclaimedOrdersOlderThanMinutes: query error", error);
      return { voidedCount: 0, orderIds: [] };
    }

    const orderIds = (orders || []).map((o) => o.id);
    const note = `Auto-voided: not claimed within ${minutes} minute(s).`;
    for (const order of orders || []) {
      try {
        await this.updateOrderStatus(order.id, "cancelled", note);
        await this.incrementVoidStrikeAndBlockIfNeeded(order);
        if (!isProduction) {
          console.log(`Auto-voided order ${order.order_number || order.id} (older than ${minutes} minute(s))`);
        }
      } catch (err) {
        console.error(`voidUnclaimedOrdersOlderThanMinutes: failed to void order ${order.id}:`, err);
      }
    }
    if (orderIds.length > 0) {
      console.log(`Auto-void job: voided ${orderIds.length} order(s) (older than ${minutes} minute(s))`);
    }
    return { voidedCount: orderIds.length, orderIds };
  }

  /**
   * Void unclaimed orders older than the given number of seconds (for testing, e.g. 10 seconds).
   * Only voids orders that have NOT been confirmed by the student (student_confirmed_at IS NULL).
   * @param {number} seconds - Number of seconds after which to void unconfirmed orders
   * @returns {Promise<{ voidedCount: number, orderIds: string[] }>}
   */
  async voidUnclaimedOrdersOlderThanSeconds(seconds) {
    const claimableStatuses = ["pending", "paid", "processing", "ready", "payment_pending"];
    const cutoff = new Date();
    cutoff.setSeconds(cutoff.getSeconds() - seconds);
    const cutoffIso = cutoff.toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, student_id, student_email")
      .eq("is_active", true)
      .in("status", claimableStatuses)
      .lt("created_at", cutoffIso)
      .is("student_confirmed_at", null);
    if (error) {
      console.error("voidUnclaimedOrdersOlderThanSeconds: query error", error);
      return { voidedCount: 0, orderIds: [] };
    }

    const orderIds = (orders || []).map((o) => o.id);
    const note = `Auto-voided: not claimed within ${seconds} second(s).`;
    for (const order of orders || []) {
      try {
        await this.updateOrderStatus(order.id, "cancelled", note);
        await this.incrementVoidStrikeAndBlockIfNeeded(order);
        if (!isProduction) {
          console.log(`Auto-voided order ${order.order_number || order.id} (older than ${seconds} second(s))`);
        }
      } catch (err) {
        console.error(`voidUnclaimedOrdersOlderThanSeconds: failed to void order ${order.id}:`, err);
      }
    }
    if (orderIds.length > 0) {
      console.log(`Auto-void job: voided ${orderIds.length} order(s) (older than ${seconds} second(s))`);
    }
    return { voidedCount: orderIds.length, orderIds };
  }

  /**
   * Student confirms/claims their order within the claim window (e.g. 10 seconds).
   * Sets student_confirmed_at so the order will not be auto-voided.
   * @param {string} orderId - Order ID
   * @param {string} studentId - Student user ID
   * @param {string} [studentEmail] - Student email (fallback)
   * @returns {Promise<Object>}
   */
  async confirmOrderByStudent(orderId, studentId, studentEmail) {
    const updates = { student_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    let query = supabase.from("orders").update(updates).eq("id", orderId).eq("is_active", true).eq("status", "pending");
    if (studentId) query = query.eq("student_id", studentId);
    else if (studentEmail) query = query.eq("student_email", studentEmail);
    else return { success: false, message: "Student identity required" };
    const { data, error } = await query.select().single();
    if (error) throw error;
    if (!data) throw new Error("Order not found or not pending");
    return { success: true, data };
  }

  /**
   * Update order (e.g. finance changes item size at student request).
   * When items change: regenerates qr_code_data so the student's QR reflects the new size;
   * unreleased/available inventory is derived from order items, so changing size automatically
   * "returns" the old size and "reserves" the new size for display.
   * @param {string} id - Order ID
   * @param {Object} updates - Fields to update (items, total_amount, etc.)
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrder(id, updates) {
    try {
      // Remove fields that shouldn't be updated directly
      const { id: _id, created_at, ...allowedUpdates } = updates;
      allowedUpdates.updated_at = new Date().toISOString();

      const newItems = allowedUpdates.items;
      if (newItems != null && (Array.isArray(newItems) || typeof newItems === "string")) {
        const itemsArray = Array.isArray(newItems) ? newItems : (() => {
          try { return JSON.parse(newItems); } catch (e) { return []; }
        })();
        if (itemsArray.length > 0) {
          const { data: currentOrder, error: fetchErr } = await supabase
            .from("orders")
            .select("order_number, student_id, student_name, student_email, education_level, status, created_at")
            .eq("id", id)
            .eq("is_active", true)
            .single();
          if (fetchErr || !currentOrder) throw fetchErr || new Error("Order not found");
          const totalAmount = allowedUpdates.total_amount != null
            ? Number(allowedUpdates.total_amount)
            : itemsArray.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
          allowedUpdates.total_amount = totalAmount;
          const qrCodeData = generateOrderReceiptQRData({
            orderNumber: currentOrder.order_number,
            studentId: currentOrder.student_id,
            studentName: currentOrder.student_name,
            studentEmail: currentOrder.student_email || "",
            items: itemsArray,
            educationLevel: currentOrder.education_level,
            totalAmount,
            orderDate: currentOrder.created_at,
            status: currentOrder.status || "pending",
          });
          allowedUpdates.qr_code_data = qrCodeData;
        }
      }

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
          // Find inventory item by name; allow student's level OR "All Education Levels" (e.g. Logo Patch)
          const { data: inventoryItems, error: searchError } = await supabase
            .from("items")
            .select("*")
            .ilike("name", item.name)
            .or(`education_level.eq."${order.education_level}",education_level.eq."All Education Levels"`)
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
                 // Try to find exact match row; allow student's level OR "All Education Levels"
                 const { data: exactMatch } = await supabase
                    .from('items')
                    .select('*')
                    .ilike('name', item.name)
                    .or(`education_level.eq."${order.education_level}",education_level.eq."All Education Levels"`)
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
