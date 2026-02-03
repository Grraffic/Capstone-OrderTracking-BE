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
   * @param {string|null} userEmail - Optional email fallback (useful when userId is not a DB UUID)
   * @returns {Promise<object>} Created transaction
   */
  async logTransaction(type, action, userId, details, metadata = {}, userEmail = null) {
    try {
      console.log("[TransactionService] 📝 Logging transaction:", {
        type,
        action,
        userId,
        details,
        userEmail,
        metadataKeys: Object.keys(metadata || {}),
      });
      
      // Normalize metadata to an object (defensive)
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        metadata = {};
      }

      // Fetch user information if userId is provided
      let userName = "System";
      let userRole = "system";

      if (userId) {
        console.log("[TransactionService] 🔍 Fetching user info for userId:", userId);
        
        // Try to fetch from students table first (since userId might be student_id)
        let { data: student, error: studentError } = await supabase
          .from("students")
          .select("id, name, email, student_type")
          .eq("id", userId)
          .single();

        // If found in students table, use that
        if (!studentError && student) {
          userName = student.name || "Unknown Student";
          userRole = "student";
          // Store email in metadata for fallback
          if (student.email && !metadata.email) {
            metadata.email = student.email;
          }
          console.log("[TransactionService] ✅ Found student in students table:", {
            id: student.id,
            name: student.name,
            email: student.email,
            table: "students",
          });
        } else {
          // Try to fetch from staff table
          let { data: staff, error: staffError } = await supabase
            .from("staff")
            .select("id, name, email, role")
            .eq("id", userId)
            .single();

          if (!staffError && staff) {
            userName = staff.name || "Unknown Staff";
            userRole = staff.role || "unknown";
            // Store email in metadata for fallback
            if (staff.email && !metadata.email) {
              metadata.email = staff.email;
            }
            console.log("[TransactionService] ✅ Found staff in staff table:", {
              id: staff.id,
              name: staff.name,
              email: staff.email,
              role: staff.role,
              table: "staff",
            });
          } else {
            // Try to fetch from users table
            let { data: user, error: userError } = await supabase
              .from("users")
              .select("name, role, email")
              .eq("id", userId)
              .single();

            if (!userError && user) {
              userName = user.name || "Unknown User";
              userRole = user.role || "unknown";
              // Store email in metadata for fallback
              if (user.email && !metadata.email) {
                metadata.email = user.email;
              }
              console.log("[TransactionService] ✅ Found user in users table:", {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                table: "users",
              });
            } else {
              // If not found by ID, try by email lookup
              console.log("[TransactionService] ⚠️ User not found by ID, trying email lookup...");
              
              // Determine which email to use for lookup
              let emailToLookup = null;
              if (typeof userId === "string" && userId.includes("@")) {
                // userId itself is an email
                emailToLookup = userId;
              } else if (userEmail && typeof userEmail === "string") {
                // Explicit email fallback passed by caller
                emailToLookup = userEmail;
              } else if (metadata?.student_email) {
                // Use student_email from metadata as fallback
                emailToLookup = metadata.student_email;
              } else if (metadata?.email) {
                // Use email from metadata as fallback
                emailToLookup = metadata.email;
              }
              
              if (emailToLookup) {
                // Normalize/stash email in metadata for later backfills/clients
                if (!metadata.email) {
                  metadata.email = String(emailToLookup).toLowerCase().trim();
                }
                // Try students table first
                const { data: emailStudent, error: emailStudentError } = await supabase
                  .from("students")
                  .select("id, name, email, student_type")
                  .eq("email", emailToLookup.toLowerCase())
                  .single();
                
                if (!emailStudentError && emailStudent) {
                  userName = emailStudent.name || "Unknown Student";
                  userRole = "student";
                  // Store email in metadata for fallback
                  if (emailStudent.email && !metadata.email) {
                    metadata.email = emailStudent.email;
                  }
                  console.log("[TransactionService] ✅ Found student by email in students table:", {
                    email: emailStudent.email,
                    name: emailStudent.name,
                    table: "students",
                    lookupMethod: "email",
                  });
                } else {
                  // Try staff table
                  const { data: emailStaff, error: emailStaffError } = await supabase
                    .from("staff")
                    .select("id, name, email, role")
                    .eq("email", emailToLookup.toLowerCase())
                    .single();
                  
                  if (!emailStaffError && emailStaff) {
                    userName = emailStaff.name || "Unknown Staff";
                    userRole = emailStaff.role || "unknown";
                    // Store email in metadata for fallback
                    if (emailStaff.email && !metadata.email) {
                      metadata.email = emailStaff.email;
                    }
                    console.log("[TransactionService] ✅ Found staff by email in staff table:", {
                      email: emailStaff.email,
                      name: emailStaff.name,
                      role: emailStaff.role,
                      table: "staff",
                      lookupMethod: "email",
                    });
                  } else {
                    // Try users table
                    const { data: emailUser, error: emailError } = await supabase
                      .from("users")
                      .select("name, role, email")
                      .eq("email", emailToLookup.toLowerCase())
                      .single();
                    
                    if (!emailError && emailUser) {
                      userName = emailUser.name || "Unknown User";
                      userRole = emailUser.role || "unknown";
                      // Store email in metadata for fallback
                      if (emailUser.email && !metadata.email) {
                        metadata.email = emailUser.email;
                      }
                      console.log("[TransactionService] ✅ Found user by email in users table:", {
                        email: emailUser.email,
                        name: emailUser.name,
                        role: emailUser.role,
                        table: "users",
                        lookupMethod: "email",
                      });
                    } else {
                      console.warn("[TransactionService] ⚠️ Could not find user/student/staff by email:", {
                        email: emailToLookup,
                        studentError: emailStudentError?.message,
                        staffError: emailStaffError?.message,
                        userError: emailError?.message,
                      });
                    }
                  }
                }
              } else {
                console.warn("[TransactionService] ⚠️ No email available for fallback lookup");
              }
            }
          }
        }

        // User info is already set above if found
        if (userName === "System") {
          console.warn("[TransactionService] ⚠️ Could not fetch user/student:", {
            userId,
            hasMetadata: !!metadata,
            studentEmail: metadata?.student_email,
          });
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
        userRole: filters.userRole,
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

      if (filters.userRole) {
        query = query.eq("user_role", filters.userRole);
        console.log("[TransactionService] 🔽 Filtering by userRole:", filters.userRole);
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

  /**
   * Backfill Item transactions where user_name is missing/System by resolving user via user_id or metadata email.
   * Intended for system admins to fix historic audit entries.
   *
   * @param {number} limit - Max transactions to process
   * @returns {Promise<{success: boolean, updated: number, scanned: number, errors: number}>}
   */
  async backfillItemTransactionsSystemUsers(limit = 500) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 5000));
    let updated = 0;
    let scanned = 0;
    let errors = 0;

    const { data: txs, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "Item")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    if (!txs || txs.length === 0) {
      return { success: true, updated: 0, scanned: 0, errors: 0 };
    }

    for (const tx of txs) {
      scanned++;
      const currentName = (tx.user_name || "").trim();
      if (currentName && currentName !== "System") continue;

      try {
        const metadata = tx.metadata && typeof tx.metadata === "object" ? { ...tx.metadata } : {};
        const emailFallback = metadata.email || metadata.student_email || null;

        // Reuse the same resolution logic by calling logTransaction's lookup part indirectly:
        // We can't call logTransaction (it would insert). So we replicate resolution by calling logTransaction with a dry-run? Not available.
        // Instead, call the same lookup code by calling logTransaction but prevent insert is not supported here.
        // We'll do a lightweight resolution by leveraging existing lookup in logTransaction via a local copy using the same tables.

        let userName = "System";
        let userRole = metadata.user_role || tx.user_role || "system";

        // Try ID lookups first
        if (tx.user_id) {
          const { data: studentRow } = await supabase
            .from("students")
            .select("name")
            .eq("id", tx.user_id)
            .maybeSingle();
          if (studentRow?.name) {
            userName = studentRow.name;
            userRole = "student";
          } else {
            const { data: staffRow } = await supabase
              .from("staff")
              .select("name, role")
              .eq("id", tx.user_id)
              .maybeSingle();
            if (staffRow?.name) {
              userName = staffRow.name;
              userRole = staffRow.role || "unknown";
            } else {
              const { data: userRow } = await supabase
                .from("users")
                .select("name, role, email")
                .eq("id", tx.user_id)
                .maybeSingle();
              if (userRow?.name) {
                userName = userRow.name;
                userRole = userRow.role || "unknown";
                if (userRow.email && !metadata.email) metadata.email = userRow.email;
              }
            }
          }
        }

        // Fallback to email lookups
        if (userName === "System" && emailFallback) {
          const email = String(emailFallback).toLowerCase().trim();
          const { data: studentByEmail } = await supabase
            .from("students")
            .select("name")
            .eq("email", email)
            .maybeSingle();
          if (studentByEmail?.name) {
            userName = studentByEmail.name;
            userRole = "student";
            metadata.email = email;
          } else {
            const { data: staffByEmail } = await supabase
              .from("staff")
              .select("name, role, email")
              .eq("email", email)
              .maybeSingle();
            if (staffByEmail?.name) {
              userName = staffByEmail.name;
              userRole = staffByEmail.role || "unknown";
              metadata.email = staffByEmail.email || email;
            } else {
              const { data: userByEmail } = await supabase
                .from("users")
                .select("name, role, email")
                .eq("email", email)
                .maybeSingle();
              if (userByEmail?.name) {
                userName = userByEmail.name;
                userRole = userByEmail.role || "unknown";
                metadata.email = userByEmail.email || email;
              }
            }
          }
        }

        if (!userName || userName === "System") continue;

        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            user_name: userName,
            user_role: userRole || tx.user_role || "unknown",
            metadata,
          })
          .eq("id", tx.id);

        if (updateError) throw updateError;
        updated++;
      } catch (e) {
        errors++;
        console.warn("[TransactionService] backfillItemTransactionsSystemUsers failed for tx:", tx?.id, e?.message);
      }
    }

    return { success: true, updated, scanned, errors };
  }
}

module.exports = new TransactionService();
