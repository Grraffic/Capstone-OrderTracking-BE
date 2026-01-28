const supabase = require("../../config/supabase");
const { normalizeName } = require("../../config/itemMasterList");

/**
 * System Admin Items Service
 *
 * Handles system admin operations for items management
 */

class SystemAdminItemsService {
  /**
   * Get items for approval management (with optional filters + pagination)
   * @param {Object} filters
   * @param {boolean} filters.pendingOnly
   * @param {string} [filters.search]
   * @param {number} page
   * @param {number} limit
   */
  async getItems(filters = {}, page = 1, limit = 10) {
    try {
      const pendingOnly = !!filters.pendingOnly;
      const search = (filters.search || "").trim();

      let query = supabase
        .from("items")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      if (pendingOnly) {
        query = query.eq("is_approved", false);
      }

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const from = (page - 1) * limit;
      query = query
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);

      let { data, error, count } = await query;

      // Backward compatibility: if approval column does not exist, retry without it
      if (
        error &&
        (error.code === "42703" ||
          error.message?.includes("is_approved") ||
          error.message?.includes("column"))
      ) {
        let fallback = supabase
          .from("items")
          .select("*", { count: "exact" })
          .eq("is_active", true);
        if (search) fallback = fallback.ilike("name", `%${search}%`);
        const fallbackResult = await fallback
          .order("created_at", { ascending: false })
          .range(from, from + limit - 1);
        data = fallbackResult.data;
        error = fallbackResult.error;
        count = fallbackResult.count;
      }

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
      console.error("Get items (system admin) error:", error);
      throw new Error(`Failed to fetch items: ${error.message}`);
    }
  }

  /**
   * Get approval stats (total/approved/pending)
   */
  async getApprovalStats() {
    try {
      // Use head:true count queries for efficiency
      const base = supabase.from("items").select("id", {
        count: "exact",
        head: true,
      });

      const [{ count: total, error: totalErr }, { count: approved, error: apprErr }, { count: pending, error: pendErr }] =
        await Promise.all([
          base.eq("is_active", true),
          base.eq("is_active", true).eq("is_approved", true),
          base.eq("is_active", true).eq("is_approved", false),
        ]);

      // Backward compatibility: approval column may not exist
      if (
        apprErr &&
        (apprErr.code === "42703" ||
          apprErr.message?.includes("is_approved") ||
          apprErr.message?.includes("column"))
      ) {
        return {
          success: true,
          data: {
            total: total || 0,
            approved: 0,
            pending: 0,
          },
        };
      }

      if (totalErr) throw totalErr;
      if (apprErr) throw apprErr;
      if (pendErr) throw pendErr;

      return {
        success: true,
        data: {
          total: total || 0,
          approved: approved || 0,
          pending: pending || 0,
        },
      };
    } catch (error) {
      console.error("Get approval stats error:", error);
      throw new Error(`Failed to fetch approval stats: ${error.message}`);
    }
  }

  /**
   * Approve an item
   * @param {string} itemId - Item ID to approve
   * @param {string} approvedBy - System admin user ID who is approving
   */
  async approveItem(itemId, approvedBy) {
    try {
      // Check if item exists
      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!item) throw new Error("Item not found");

      // Update approval status
      const { data, error } = await supabase
        .from("items")
        .update({
          is_approved: true,
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: "Item approved successfully",
      };
    } catch (error) {
      console.error("Approve item error:", error);
      throw new Error(`Failed to approve item: ${error.message}`);
    }
  }

  /**
   * Approve multiple items at once
   * @param {string[]} itemIds - Array of item IDs to approve
   * @param {string} approvedBy - System admin user ID who is approving
   */
  async approveMultipleItems(itemIds, approvedBy) {
    try {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error("itemIds must be a non-empty array");
      }

      const results = [];
      const errors = [];

      for (const itemId of itemIds) {
        try {
          const result = await this.approveItem(itemId, approvedBy);
          results.push(result.data);
        } catch (error) {
          errors.push({
            itemId,
            error: error.message,
          });
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        message: `Approved ${results.length} of ${itemIds.length} items`,
      };
    } catch (error) {
      console.error("Approve multiple items error:", error);
      throw new Error(`Failed to approve multiple items: ${error.message}`);
    }
  }

  /**
   * Reject an item (unapprove)
   * @param {string} itemId - Item ID to reject
   */
  async rejectItem(itemId) {
    try {
      // Check if item exists
      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", itemId)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!item) throw new Error("Item not found");

      // Update approval status to false
      const { data, error } = await supabase
        .from("items")
        .update({
          is_approved: false,
          approved_by: null,
          approved_at: null,
        })
        .eq("id", itemId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: "Item rejected successfully",
      };
    } catch (error) {
      console.error("Reject item error:", error);
      throw new Error(`Failed to reject item: ${error.message}`);
    }
  }

  /**
   * Promote an item's name into the curated name suggestions table.
   * Idempotent by normalized_name (upsert).
   * @param {string} itemId
   * @param {string} createdBy
   */
  async promoteItemNameToSuggestions(itemId, createdBy) {
    try {
      // Fetch the item
      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("id,name,education_level")
        .eq("id", itemId)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      if (!item) throw new Error("Item not found");

      const name = (item.name || "").trim();
      if (!name) throw new Error("Item name is empty");

      const normalized_name = normalizeName(name);
      const payload = {
        name,
        normalized_name,
        education_level: item.education_level || null,
        source_item_id: item.id,
        created_by: createdBy || null,
      };

      const { data, error } = await supabase
        .from("item_name_suggestions")
        .upsert([payload], { onConflict: "normalized_name" })
        .select()
        .single();

      // If table doesn't exist, guide user to run migration (but don't crash the server)
      if (error && error.code === "42P01") {
        throw new Error(
          'Table "item_name_suggestions" does not exist. Run the migration to enable curated suggestions.'
        );
      }

      if (error) throw error;

      return {
        success: true,
        data,
        message: "Item name added to suggestions",
      };
    } catch (error) {
      console.error("Promote item name to suggestions error:", error);
      throw new Error(`Failed to add name to suggestions: ${error.message}`);
    }
  }
}

module.exports = new SystemAdminItemsService();
