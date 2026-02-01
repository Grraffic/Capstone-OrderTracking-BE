const supabase = require("../../config/supabase");

/**
 * Student Item Permissions Service
 *
 * Handles all database operations for student-item permissions management
 * Allows system admins to manually grant ordering permissions to old students
 */

/**
 * Normalize item name for lookup: lowercase, collapse spaces, trim
 */
function normalizeItemName(name) {
  if (!name || typeof name !== "string") return "";
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Resolve item name to canonical key (same logic as itemMaxOrder.js)
 */
function resolveItemKey(name) {
  const n = normalizeItemName(name);
  // Any "X Jogging Pants" (e.g. "Small Jogging Pants") counts as "jogging pants" for limits
  if (n && n.includes("jogging pants")) return "jogging pants";
  // "New Logo Patch" and "Logo Patch" are the SAME item - always normalize to "logo patch"
  if (n && (n.includes("new logo patch") || n.includes("logo patch"))) return "logo patch";
  return n;
}

/**
 * Map user education level to item education level format
 */
function mapEducationLevelToItemLevel(userEducationLevel) {
  const map = {
    "Preschool": "Kindergarten",
    "Kindergarten": "Kindergarten",
    "Elementary": "Elementary",
    "High School": "Junior High School",
    "Junior High School": "Junior High School",
    "Senior High School": "Senior High School",
    "College": "College",
    "Vocational": "College",
  };
  return map[userEducationLevel] || userEducationLevel;
}

/**
 * Get all items for a student's education level, grouped by education level
 * Returns items with current permission status
 * @param {string} studentId - Student UUID
 * @param {string} educationLevel - Student's education level (e.g., "Elementary", "High School")
 * @returns {Promise<Object>} Items grouped by education level with permission status
 */
async function getItemsForStudentPermission(studentId, educationLevel) {
  try {
    // Resolve studentId to actual students.id (foreign key references students(id))
    let actualStudentId = studentId;
    
    // Check if studentId is from students table
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();
    
    if (!studentRow) {
      // Not found in students table - check if it's users.id and find students.id
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("id", studentId)
        .maybeSingle();
      
      if (userRow) {
        const { data: studentByUserId } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", studentId)
          .maybeSingle();
        
        if (studentByUserId) {
          actualStudentId = studentByUserId.id;
        }
        // If not found, actualStudentId remains as studentId (will fail on query, but that's OK)
      }
    }

    // Map user education level to item education level
    const itemEducationLevel = mapEducationLevelToItemLevel(educationLevel);

    // Get all items for this education level OR "All Education Levels" OR "General"
    // Format: "education_level.eq.College,education_level.eq.All Education Levels,education_level.eq.General"
    const orFilter = `education_level.eq.${itemEducationLevel},education_level.eq.All Education Levels,education_level.eq.General`;
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("id, name, education_level, category, item_type")
      .eq("is_active", true)
      .eq("is_approved", true)
      .or(orFilter)
      .order("name", { ascending: true });

    if (itemsError) throw itemsError;

    // Get existing permissions for this student (use actualStudentId)
    // Only fetch enabled permissions - disabled items should not be shown as enabled
    const { data: permissions, error: permissionsError } = await supabase
      .from("student_item_permissions")
      .select("item_name, enabled, quantity")
      .eq("student_id", actualStudentId)
      .eq("enabled", true); // Only get enabled permissions

    if (permissionsError && permissionsError.code !== "42P01") {
      // If table doesn't exist, that's okay - no permissions yet
      throw permissionsError;
    }

    // Create a map of item_name -> {enabled, quantity}
    const permissionsMap = {};
    if (permissions) {
      permissions.forEach((p) => {
        permissionsMap[p.item_name] = {
          enabled: p.enabled,
          quantity: p.quantity,
        };
      });
    }

    // Group items by education level and normalize item names
    const itemsByLevel = {
      "Kindergarten": [],
      "Elementary": [],
      "Junior High School": [],
      "Senior High School": [],
      "College": [],
      "All Education Levels": [],
    };

    // Track unique item names (normalized) to avoid duplicates
    const seenItemNames = new Set();

    items.forEach((item) => {
      const normalizedName = resolveItemKey(item.name);
      
      // Skip if we've already seen this normalized item name
      if (seenItemNames.has(normalizedName)) return;
      seenItemNames.add(normalizedName);

      const level = item.education_level || "All Education Levels";
      const levelKey = level === "General" ? "All Education Levels" : level;

      if (!itemsByLevel[levelKey]) {
        itemsByLevel[levelKey] = [];
      }

      const permission = permissionsMap[normalizedName];
      itemsByLevel[levelKey].push({
        id: item.id,
        name: item.name,
        normalizedName: normalizedName,
        category: item.category,
        itemType: item.item_type,
        enabled: permission?.enabled ?? false,
        quantity: permission?.quantity ?? null,
      });
    });

    // Remove empty education levels
    Object.keys(itemsByLevel).forEach((key) => {
      if (itemsByLevel[key].length === 0) {
        delete itemsByLevel[key];
      }
    });

    return {
      success: true,
      data: itemsByLevel,
    };
  } catch (error) {
    console.error("Get items for student permission error:", error);
    return {
      success: false,
      error: error.message,
      data: {},
    };
  }
}

/**
 * Get all permissions for a student
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} Map of item_name -> {enabled, quantity}
 */
async function getStudentItemPermissions(studentId) {
  try {
    // Resolve studentId to actual students.id (foreign key references students(id))
    let actualStudentId = studentId;
    
    // Check if studentId is from students table
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();
    
    if (!studentRow) {
      // Not found in students table - check if it's users.id and find students.id
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("id", studentId)
        .maybeSingle();
      
      if (userRow) {
        const { data: studentByUserId } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", studentId)
          .maybeSingle();
        
        if (studentByUserId) {
          actualStudentId = studentByUserId.id;
        }
        // If not found, actualStudentId remains as studentId (will fail on query, but that's OK)
      }
    }
    
    // Get all permissions (enabled and disabled) for display in admin UI
    // The admin needs to see all permissions to show checkboxes correctly
    // When checking if student can order (in auth.js), we filter to only enabled ones
    const { data: permissions, error } = await supabase
      .from("student_item_permissions")
      .select("item_name, enabled, quantity")
      .eq("student_id", actualStudentId);

    // If table doesn't exist (42P01), return empty map (no permissions yet)
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("student_item_permissions table does not exist yet. Returning empty permissions.");
        return {
          success: true,
          data: {},
        };
      }
      // For other errors, throw to be caught below
      throw error;
    }

    const permissionsMap = {};
    if (permissions) {
      permissions.forEach((p) => {
        permissionsMap[p.item_name] = {
          enabled: p.enabled,
          quantity: p.quantity,
        };
      });
    }

    return {
      success: true,
      data: permissionsMap,
    };
  } catch (error) {
    console.error("Get student item permissions error:", error);
    // Return empty permissions instead of failing - allows frontend to work even if table doesn't exist
    return {
      success: true,
      data: {},
      warning: error.message,
    };
  }
}

/**
 * Update permissions for a single student
 * @param {string} studentId - Student UUID
 * @param {Object} permissions - Object mapping item_name (normalized) -> {enabled: boolean, quantity: number|null}
 * @returns {Promise<Object>} Update result
 */
async function updateStudentItemPermissions(studentId, permissions) {
  try {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    if (!permissions || typeof permissions !== "object") {
      throw new Error("Permissions must be an object");
    }

    // Verify student exists and get the correct students.id
    // The foreign key references students(id), so we need students.id
    let actualStudentId = null;
    let studentType = null;
    
    // Try students table first (where student-specific data is stored)
    const { data: studentRow, error: studentsError } = await supabase
      .from("students")
      .select("id, student_type")
      .eq("id", studentId)
      .maybeSingle();
    
    if (studentRow) {
      // Found in students table - use this ID directly
      actualStudentId = studentRow.id;
      studentType = studentRow.student_type;
    } else {
      // Not found in students table - check if it's a users.id and find corresponding students.id
      const { data: userRow, error: usersError } = await supabase
        .from("users")
        .select("id")
        .eq("id", studentId)
        .maybeSingle();
      
      if (userRow) {
        // Found in users table - find corresponding students.id via user_id
        const { data: studentByUserId, error: lookupError } = await supabase
          .from("students")
          .select("id, student_type")
          .eq("user_id", studentId)
          .maybeSingle();
        
        if (studentByUserId) {
          actualStudentId = studentByUserId.id;
          studentType = studentByUserId.student_type;
        } else if (lookupError && lookupError.code !== "PGRST116") {
          throw lookupError;
        } else {
          throw new Error("Student not found in students table. The student_id must reference students(id).");
        }
      } else if (usersError && usersError.code !== "PGRST116") {
        throw usersError;
      } else {
        throw new Error("Student not found");
      }
    }
    
    if (!actualStudentId) {
      throw new Error("Could not resolve student ID. Student must exist in students table.");
    }

    // Separate enabled and disabled permissions
    const enabledPermissions = [];
    const disabledItemNames = [];
    
    Object.entries(permissions).forEach(([itemName, perm]) => {
      const permObj = typeof perm === "object" ? perm : { enabled: Boolean(perm), quantity: null };
      if (permObj.enabled) {
        enabledPermissions.push({
          student_id: actualStudentId, // Use students.id for foreign key
          item_name: itemName,
          enabled: true,
          quantity: permObj.quantity != null && permObj.quantity > 0 ? parseInt(permObj.quantity, 10) : null,
        });
      } else {
        // Item is disabled - add to list for deletion
        disabledItemNames.push(itemName);
      }
    });

    // Delete disabled permissions (if any)
    if (disabledItemNames.length > 0) {
      const { error: deleteError } = await supabase
        .from("student_item_permissions")
        .delete()
        .eq("student_id", actualStudentId)
        .in("item_name", disabledItemNames);

      if (deleteError) {
        // Check if table doesn't exist
        if (deleteError.code === "42P01" || deleteError.message?.includes("does not exist")) {
          throw new Error("student_item_permissions table does not exist. Please run the migration: backend/migrations/create_student_item_permissions.sql");
        }
        console.error("Delete disabled permissions error:", deleteError);
        throw deleteError;
      }
    }

    // Upsert only enabled permissions
    if (enabledPermissions.length > 0) {
      const { error: upsertError } = await supabase
        .from("student_item_permissions")
        .upsert(enabledPermissions, {
          onConflict: "student_id,item_name",
        });

      if (upsertError) {
        // Check if table doesn't exist
        if (upsertError.code === "42P01" || upsertError.message?.includes("does not exist")) {
          throw new Error("student_item_permissions table does not exist. Please run the migration: backend/migrations/create_student_item_permissions.sql");
        }
        // Log the full error for debugging
        console.error("Upsert error details:", {
          code: upsertError.code,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
        });
        throw upsertError;
      }
    }

    const totalUpdated = enabledPermissions.length + disabledItemNames.length;

    return {
      success: true,
      message: totalUpdated > 0 
        ? `Updated ${totalUpdated} permission(s) for student (${enabledPermissions.length} enabled, ${disabledItemNames.length} disabled)`
        : "No permissions to update",
    };
  } catch (error) {
    console.error("Update student item permissions error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Bulk update permissions for multiple students
 * @param {Array<string>} studentIds - Array of student UUIDs
 * @param {Object} permissions - Object mapping item_name (normalized) -> {enabled: boolean, quantity: number|null}
 * @returns {Promise<Object>} Update result
 */
async function bulkUpdateStudentItemPermissions(studentIds, permissions) {
  try {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error("Student IDs array is required and must not be empty");
    }

    if (!permissions || typeof permissions !== "object") {
      throw new Error("Permissions must be an object");
    }

    // Verify all students exist and map to students.id
    // The foreign key references students(id), so we need actual students.id values
    const studentIdMap = new Map(); // Maps input ID -> students.id
    
    // Check students table first
    const { data: studentsRows, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .in("id", studentIds);
    
    if (studentsRows) {
      studentsRows.forEach(row => studentIdMap.set(row.id, row.id));
    }
    
    // For any not found in students table, check if they're users.id and find corresponding students.id
    const missingIds = studentIds.filter(id => !studentIdMap.has(id));
    if (missingIds.length > 0) {
      const { data: usersRows, error: usersError } = await supabase
        .from("users")
        .select("id")
        .in("id", missingIds);
      
      if (usersRows && usersRows.length > 0) {
        // Find corresponding students.id for each users.id
        const userIds = usersRows.map(u => u.id);
        const { data: studentsByUserId, error: lookupError } = await supabase
          .from("students")
          .select("id, user_id")
          .in("user_id", userIds);
        
        if (studentsByUserId) {
          studentsByUserId.forEach(row => {
            // Map users.id -> students.id
            const userId = row.user_id;
            if (userIds.includes(userId)) {
              studentIdMap.set(userId, row.id);
            }
          });
        }
        
        if (lookupError && lookupError.code !== "PGRST116") {
          throw lookupError;
        }
      }
      
      if (usersError && usersError.code !== "PGRST116") {
        throw usersError;
      }
    }
    
    if (studentsError && studentsError.code !== "PGRST116") {
      throw studentsError;
    }
    
    // Verify we found all students
    const resolvedStudentIds = Array.from(studentIdMap.values());
    if (resolvedStudentIds.length !== studentIds.length) {
      throw new Error("One or more students not found in students table. All student IDs must reference students(id).");
    }

    // Separate enabled and disabled permissions for all students
    const enabledPermissions = [];
    const disabledPermissions = []; // Array of {student_id, item_name}
    
    studentIds.forEach((inputStudentId) => {
      const actualStudentId = studentIdMap.get(inputStudentId);
      if (!actualStudentId) {
        throw new Error(`Could not resolve student ID ${inputStudentId} to students.id`);
      }
      
      Object.entries(permissions).forEach(([itemName, perm]) => {
        const permObj = typeof perm === "object" ? perm : { enabled: Boolean(perm), quantity: null };
        if (permObj.enabled) {
          enabledPermissions.push({
            student_id: actualStudentId, // Use students.id for foreign key
            item_name: itemName,
            enabled: true,
            quantity: permObj.quantity != null && permObj.quantity > 0 ? parseInt(permObj.quantity, 10) : null,
          });
        } else {
          // Item is disabled - add to list for deletion
          disabledPermissions.push({
            student_id: actualStudentId,
            item_name: itemName,
          });
        }
      });
    });

    // Delete disabled permissions (if any)
    if (disabledPermissions.length > 0) {
      // Group by student_id for efficient deletion
      const disabledByStudent = {};
      disabledPermissions.forEach(({ student_id, item_name }) => {
        if (!disabledByStudent[student_id]) {
          disabledByStudent[student_id] = [];
        }
        disabledByStudent[student_id].push(item_name);
      });

      // Delete for each student
      for (const [studentId, itemNames] of Object.entries(disabledByStudent)) {
        const { error: deleteError } = await supabase
          .from("student_item_permissions")
          .delete()
          .eq("student_id", studentId)
          .in("item_name", itemNames);

        if (deleteError) {
          // Check if table doesn't exist
          if (deleteError.code === "42P01" || deleteError.message?.includes("does not exist")) {
            throw new Error("student_item_permissions table does not exist. Please run the migration: backend/migrations/create_student_item_permissions.sql");
          }
          console.error("Delete disabled permissions error:", deleteError);
          throw deleteError;
        }
      }
    }

    // Upsert only enabled permissions
    if (enabledPermissions.length > 0) {
      const { error: upsertError } = await supabase
        .from("student_item_permissions")
        .upsert(enabledPermissions, {
          onConflict: "student_id,item_name",
        });

      if (upsertError) {
        // Check if table doesn't exist
        if (upsertError.code === "42P01" || upsertError.message?.includes("does not exist")) {
          throw new Error("student_item_permissions table does not exist. Please run the migration: backend/migrations/create_student_item_permissions.sql");
        }
        console.error("Upsert error details:", {
          code: upsertError.code,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
        });
        throw upsertError;
      }
    }

    const totalUpdated = enabledPermissions.length + disabledPermissions.length;

    return {
      success: true,
      message: totalUpdated > 0
        ? `Updated permissions for ${studentIds.length} student(s) (${enabledPermissions.length} enabled, ${disabledPermissions.length} disabled)`
        : "No permissions to update",
    };
  } catch (error) {
    console.error("Bulk update student item permissions error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if a student has permission to order a specific item
 * @param {string} studentId - Student UUID
 * @param {string} itemName - Item name (will be normalized)
 * @returns {Promise<boolean>} True if student has permission, false otherwise
 */
async function hasStudentItemPermission(studentId, itemName) {
  try {
    // Resolve studentId to actual students.id (foreign key references students(id))
    let actualStudentId = studentId;
    
    // Check if studentId is from students table
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();
    
    if (!studentRow) {
      // Not found in students table - check if it's users.id and find students.id
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("id", studentId)
        .maybeSingle();
      
      if (userRow) {
        const { data: studentByUserId } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", studentId)
          .maybeSingle();
        
        if (studentByUserId) {
          actualStudentId = studentByUserId.id;
        }
      }
    }
    
    const normalizedName = resolveItemKey(itemName);
    
    const { data: permission, error } = await supabase
      .from("student_item_permissions")
      .select("enabled")
      .eq("student_id", actualStudentId)
      .eq("item_name", normalizedName)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Check student item permission error:", error);
      return false;
    }

    return permission ? permission.enabled : false;
  } catch (error) {
    console.error("Has student item permission error:", error);
    return false;
  }
}

module.exports = {
  getItemsForStudentPermission,
  getStudentItemPermissions,
  updateStudentItemPermissions,
  bulkUpdateStudentItemPermissions,
  hasStudentItemPermission,
  resolveItemKey, // Export for use in other services
};
