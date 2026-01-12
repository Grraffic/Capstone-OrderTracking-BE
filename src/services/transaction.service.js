const supabase = require("../config/supabase");

/**
 * Transaction Service
 * 
 * Handles transaction logging and retrieval for system audit trail
 */
class TransactionService {
  /**
   * Log a transaction
   * @param {string} type - Transaction type: 'Order', 'Inventory', 'Item', 'User'
   * @param {string} action - Specific action: 'ORDER CREATED', 'STOCK ADDED', etc.
   * @param {string} userId - User ID who performed the action
   * @param {string} details - Human-readable transaction details
   * @param {object} metadata - Additional structured data (order_id, item_id, etc.)
   * @returns {Promise<object>} Created transaction
   */
  async logTransaction(type, action, userId, details, metadata = {}) {
    try {
      console.log("[TransactionService] 📝 Logging transaction:", {
        type,
        action,
        userId,
        details,
        metadataKeys: Object.keys(metadata),
      });
      
      // Fetch user information if userId is provided
      let userName = "System";
      let userRole = "system";

      if (userId) {
        console.log("[TransactionService] 🔍 Fetching user info for userId:", userId);
        
        // Try to fetch by ID first
        let { data: user, error: userError } = await supabase
          .from("users")
          .select("name, role, email")
          .eq("id", userId)
          .single();

        // If not found by ID, try by email (in case JWT has email as ID or userId is not a valid UUID)
        if (userError || !user) {
          console.log("[TransactionService] ⚠️ User not found by ID, trying email lookup...");
          
          // Determine which email to use for lookup
          let emailToLookup = null;
          if (typeof userId === "string" && userId.includes("@")) {
            // userId itself is an email
            emailToLookup = userId;
          } else if (userEmail) {
            // Use provided userEmail as fallback
            emailToLookup = userEmail;
          }
          
          if (emailToLookup) {
            const { data: emailUser, error: emailError } = await supabase
              .from("users")
              .select("name, role, email")
              .eq("email", emailToLookup.toLowerCase())
              .single();
            
            if (!emailError && emailUser) {
              user = emailUser;
              userError = null;
              console.log("[TransactionService] ✅ Found user by email:", {
                email: emailUser.email,
                name: emailUser.name,
                role: emailUser.role,
              });
            } else {
              console.warn("[TransactionService] ⚠️ Could not find user by email either:", {
                email: emailToLookup,
                error: emailError?.message,
              });
            }
          } else {
            console.warn("[TransactionService] ⚠️ No email available for fallback lookup");
          }
        }

        if (!userError && user) {
          userName = user.name || "Unknown User";
          userRole = user.role || "unknown";
          console.log("[TransactionService] ✅ User info fetched:", { 
            userName, 
            userRole,
            userId,
            userEmail: user.email,
          });
        } else {
          console.warn("[TransactionService] ⚠️ Could not fetch user:", {
            userId,
            error: userError?.message || "User not found",
            errorCode: userError?.code,
          });
          // Try to get user info from JWT token if available (fallback)
          // This will be handled by the middleware that sets req.user
        }
      } else {
        console.log("[TransactionService] ℹ️ No userId provided, using System user");
      }

      // Insert transaction
      console.log("[TransactionService] 💾 Inserting transaction into database...");
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          type,
          action,
          user_id: userId || null,
          user_name: userName,
          user_role: userRole,
          details,
          metadata,
        })
        .select()
        .single();

      if (error) {
        console.error("[TransactionService] ❌ Database error:", error);
        throw error;
      }

      console.log("[TransactionService] ✅ Transaction logged successfully:", {
        id: data.id,
        type: data.type,
        action: data.action,
        created_at: data.created_at,
      });

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("[TransactionService] ❌ Log transaction error:", error);
      console.error("[TransactionService] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to log transaction: ${error.message}`);
    }
  }

  /**
   * Get transactions with optional filters
   * @param {object} filters - Filter options
   * @param {string} filters.type - Filter by transaction type
   * @param {string} filters.action - Filter by action
   * @param {string} filters.userId - Filter by user ID
   * @param {Date} filters.startDate - Start date for date range
   * @param {Date} filters.endDate - End date for date range
   * @param {number} filters.limit - Maximum number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<object>} Transactions list
   */
  async getTransactions(filters = {}) {
    try {
      console.log("[TransactionService] 🔍 Getting transactions with filters:", {
        type: filters.type,
        action: filters.action,
        userId: filters.userId,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        limit: filters.limit,
        offset: filters.offset,
      });
      
      let query = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq("type", filters.type);
        console.log("[TransactionService] 🔽 Filtering by type:", filters.type);
      }

      if (filters.action) {
        query = query.eq("action", filters.action);
        console.log("[TransactionService] 🔽 Filtering by action:", filters.action);
      }

      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
        console.log("[TransactionService] 🔽 Filtering by userId:", filters.userId);
      }

      if (filters.startDate) {
        const startDateISO = filters.startDate.toISOString();
        query = query.gte("created_at", startDateISO);
        console.log("[TransactionService] 🔽 Filtering by startDate:", startDateISO);
      }

      if (filters.endDate) {
        const endDateISO = filters.endDate.toISOString();
        query = query.lte("created_at", endDateISO);
        console.log("[TransactionService] 🔽 Filtering by endDate:", endDateISO);
      }

      // Apply pagination
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);
      console.log("[TransactionService] 📄 Pagination:", { limit, offset });

      console.log("[TransactionService] 🚀 Executing query...");
      const { data, error, count } = await query;

      if (error) {
        console.error("[TransactionService] ❌ Query error:", error);
        throw error;
      }

      console.log("[TransactionService] ✅ Query successful:", {
        dataCount: data?.length || 0,
        count,
        sampleTransaction: data?.[0] ? {
          id: data[0].id,
          type: data[0].type,
          action: data[0].action,
          created_at: data[0].created_at,
        } : null,
      });

      return {
        success: true,
        data: data || [],
        count: data?.length || 0,
      };
    } catch (error) {
      console.error("[TransactionService] ❌ Get transactions error:", error);
      console.error("[TransactionService] Error details:", {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  /**
   * Get transactions by type
   * @param {string} type - Transaction type
   * @param {number} limit - Maximum number of results
   * @returns {Promise<object>} Transactions list
   */
  async getTransactionsByType(type, limit = 100) {
    return this.getTransactions({ type, limit });
  }

  /**
   * Get recent transactions
   * @param {number} limit - Maximum number of results
   * @returns {Promise<object>} Recent transactions
   */
  async getRecentTransactions(limit = 50) {
    return this.getTransactions({ limit });
  }

  /**
   * Get transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Promise<object>} Transaction
   */
  async getTransactionById(id) {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Transaction not found");

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Get transaction by ID error:", error);
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }
}

module.exports = new TransactionService();
