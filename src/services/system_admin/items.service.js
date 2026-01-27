const supabase = require("../../config/supabase");

/**
 * System Admin Items Service
 *
 * Handles system admin operations for items management
 */

class SystemAdminItemsService {
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
}

module.exports = new SystemAdminItemsService();
