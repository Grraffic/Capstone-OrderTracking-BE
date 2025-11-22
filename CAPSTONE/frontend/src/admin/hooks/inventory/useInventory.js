import { useState, useCallback, useMemo, useEffect } from "react";

// API base URL - adjust based on your environment
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * useInventory Hook
 *
 * Manages inventory state and operations including:
 * - Inventory items data
 * - CRUD operations (Create, Read, Update, Delete)
 * - Search and filter functionality
 * - Modal state management
 * - Stock status calculations
 *
 * Usage:
 * const {
 *   items,
 *   filteredItems,
 *   searchTerm,
 *   setSearchTerm,
 *   selectedItem,
 *   modalState,
 *   openAddModal,
 *   openEditModal,
 *   openViewModal,
 *   openDeleteModal,
 *   closeModal,
 *   addItem,
 *   updateItem,
 *   deleteItem,
 * } = useInventory();
 */
export const useInventory = () => {
  // State for inventory items (fetched from API)
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: null, // 'add', 'edit', 'view', 'delete'
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State for filters
  const [educationLevelFilter, setEducationLevelFilter] =
    useState("All Levels");
  const [itemTypeFilter, setItemTypeFilter] = useState("All Types");

  // State for item adjustment modal
  const [adjustmentModalState, setAdjustmentModalState] = useState({
    isOpen: false,
  });
  const [adjustmentData, setAdjustmentData] = useState({
    adjustmentType: "Quantity Adjustment",
    educationLevel: "",
    itemCategory: "",
    description: "",
    materialType: "",
    itemType: "",
  });

  /**
   * Fetch inventory items from API
   */
  const fetchInventoryItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/inventory`);

      if (!response.ok) {
        throw new Error("Failed to fetch inventory items");
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Transform snake_case from backend to camelCase for frontend
        const transformedData = result.data.map((item) => ({
          id: item.id,
          name: item.name,
          educationLevel: item.education_level,
          category: item.category,
          itemType: item.item_type,
          description: item.description,
          descriptionText: item.description_text,
          material: item.material,
          stock: item.stock,
          price: item.price,
          image: item.image,
          physicalCount: item.physical_count,
          available: item.available,
          reorderPoint: item.reorder_point,
          note: item.note,
          status: item.status,
          isActive: item.is_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        setItems(transformedData);
      } else {
        throw new Error(result.message || "Failed to fetch inventory items");
      }
    } catch (err) {
      console.error("Fetch inventory error:", err);
      setError(err.message);
      setItems([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch inventory items on component mount
   */
  useEffect(() => {
    fetchInventoryItems();
  }, [fetchInventoryItems]);

  /**
   * Calculate stock status based on quantity
   * NOTE: This is now handled by the backend automatically.
   * Status is calculated based on stock levels:
   * - "Out of Stock": stock = 0
   * - "Critical": stock 1-19
   * - "At Reorder Point": stock 20-49
   * - "Above Threshold": stock >= 50
   *
   * @param {number} stock - Stock quantity
   * @returns {string} - Status label
   */
  const getStockStatus = useCallback((stock) => {
    if (stock === 0) return "Out of Stock";
    if (stock >= 1 && stock < 20) return "Critical";
    if (stock >= 20 && stock < 50) return "At Reorder Point";
    return "Above Threshold";
  }, []);

  /**
   * Filter items based on search term and filters
   */
  const filteredItems = useMemo(() => {
    let result = items;

    // Apply education level filter
    if (educationLevelFilter !== "All Levels") {
      result = result.filter(
        (item) => item.educationLevel === educationLevelFilter
      );
    }

    // Apply item type filter
    if (itemTypeFilter !== "All Types") {
      result = result.filter((item) => item.itemType === itemTypeFilter);
    }

    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerSearch) ||
          item.category.toLowerCase().includes(lowerSearch) ||
          item.description.toLowerCase().includes(lowerSearch) ||
          item.itemType.toLowerCase().includes(lowerSearch) ||
          item.educationLevel.toLowerCase().includes(lowerSearch)
      );
    }

    return result;
  }, [items, searchTerm, educationLevelFilter, itemTypeFilter]);

  /**
   * Open Add Item Modal
   */
  const openAddModal = useCallback(() => {
    setSelectedItem(null);
    setModalState({ isOpen: true, mode: "add" });
  }, []);

  /**
   * Open Edit Item Modal
   * @param {Object} item - Item to edit
   */
  const openEditModal = useCallback((item) => {
    setSelectedItem(item);
    setModalState({ isOpen: true, mode: "edit" });
  }, []);

  /**
   * Open View Item Modal
   * @param {Object} item - Item to view
   */
  const openViewModal = useCallback((item) => {
    setSelectedItem(item);
    setModalState({ isOpen: true, mode: "view" });
  }, []);

  /**
   * Open Delete Confirmation Modal
   * @param {Object} item - Item to delete
   */
  const openDeleteModal = useCallback((item) => {
    setSelectedItem(item);
    setModalState({ isOpen: true, mode: "delete" });
  }, []);

  /**
   * Close Modal
   */
  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, mode: null });
    setSelectedItem(null);
  }, []);

  /**
   * Add new item to inventory
   * @param {Object} newItem - New item data
   */
  const addItem = useCallback(
    async (newItem) => {
      try {
        setLoading(true);
        setError(null);

        // Transform camelCase to snake_case for backend
        const transformedItem = {
          name: newItem.name,
          education_level: newItem.educationLevel,
          category: newItem.category,
          item_type: newItem.itemType,
          description: newItem.description,
          description_text: newItem.descriptionText,
          material: newItem.material,
          stock: Number(newItem.stock) || 0,
          price: Number(newItem.price) || 0,
          image: newItem.image || "/assets/image/card1.png",
          physical_count: Number(newItem.physicalCount) || 0,
          available: Number(newItem.available) || 0,
          reorder_point: Number(newItem.reorderPoint) || 0,
          note: newItem.note || "",
        };

        const response = await fetch(`${API_BASE_URL}/inventory`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transformedItem),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add inventory item");
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Transform snake_case back to camelCase for frontend state
          const transformedData = {
            id: result.data.id,
            name: result.data.name,
            educationLevel: result.data.education_level,
            category: result.data.category,
            itemType: result.data.item_type,
            description: result.data.description,
            descriptionText: result.data.description_text,
            material: result.data.material,
            stock: result.data.stock,
            price: result.data.price,
            image: result.data.image,
            physicalCount: result.data.physical_count,
            available: result.data.available,
            reorderPoint: result.data.reorder_point,
            note: result.data.note,
            status: result.data.status,
            isActive: result.data.is_active,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          };

          // Add the new item to the local state
          setItems((prev) => [transformedData, ...prev]);
          closeModal();
        } else {
          throw new Error(result.message || "Failed to add inventory item");
        }
      } catch (err) {
        console.error("Add item error:", err);
        setError(err.message);
        throw err; // Re-throw to allow caller to handle
      } finally {
        setLoading(false);
      }
    },
    [closeModal]
  );

  /**
   * Update existing item
   * @param {Object} updatedItem - Updated item data
   */
  const updateItem = useCallback(
    async (updatedItem) => {
      try {
        setLoading(true);
        setError(null);

        // Transform camelCase to snake_case for backend
        const transformedItem = {
          name: updatedItem.name,
          education_level: updatedItem.educationLevel,
          category: updatedItem.category,
          item_type: updatedItem.itemType,
          description: updatedItem.description,
          description_text: updatedItem.descriptionText,
          material: updatedItem.material,
          stock: Number(updatedItem.stock) || 0,
          price: Number(updatedItem.price) || 0,
          image: updatedItem.image,
          physical_count: Number(updatedItem.physicalCount) || 0,
          available: Number(updatedItem.available) || 0,
          reorder_point: Number(updatedItem.reorderPoint) || 0,
          note: updatedItem.note || "",
        };

        const response = await fetch(
          `${API_BASE_URL}/inventory/${updatedItem.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(transformedItem),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to update inventory item"
          );
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Transform snake_case back to camelCase for frontend state
          const transformedData = {
            id: result.data.id,
            name: result.data.name,
            educationLevel: result.data.education_level,
            category: result.data.category,
            itemType: result.data.item_type,
            description: result.data.description,
            descriptionText: result.data.description_text,
            material: result.data.material,
            stock: result.data.stock,
            price: result.data.price,
            image: result.data.image,
            physicalCount: result.data.physical_count,
            available: result.data.available,
            reorderPoint: result.data.reorder_point,
            note: result.data.note,
            status: result.data.status,
            isActive: result.data.is_active,
            createdAt: result.data.created_at,
            updatedAt: result.data.updated_at,
          };

          // Update the item in local state
          setItems((prev) =>
            prev.map((item) =>
              item.id === updatedItem.id ? transformedData : item
            )
          );
          closeModal();
        } else {
          throw new Error(result.message || "Failed to update inventory item");
        }
      } catch (err) {
        console.error("Update item error:", err);
        setError(err.message);
        throw err; // Re-throw to allow caller to handle
      } finally {
        setLoading(false);
      }
    },
    [closeModal]
  );

  /**
   * Delete item from inventory
   * @param {string} itemId - ID of item to delete
   */
  const deleteItem = useCallback(
    async (itemId) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/inventory/${itemId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to delete inventory item"
          );
        }

        const result = await response.json();

        if (result.success) {
          // Remove the item from local state
          setItems((prev) => prev.filter((item) => item.id !== itemId));
          closeModal();
        } else {
          throw new Error(result.message || "Failed to delete inventory item");
        }
      } catch (err) {
        console.error("Delete item error:", err);
        setError(err.message);
        throw err; // Re-throw to allow caller to handle
      } finally {
        setLoading(false);
      }
    },
    [closeModal]
  );

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredItems.length / itemsPerPage);
  }, [filteredItems.length, itemsPerPage]);

  // Handle page change
  const goToPage = useCallback(
    (page) => {
      const pageNum = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(pageNum);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  /**
   * Open Item Adjustment Modal
   * @param {Object} item - Item to adjust
   */
  const openAdjustmentModal = useCallback((item) => {
    setSelectedItem(item);
    setAdjustmentModalState({ isOpen: true });
    setAdjustmentData({
      adjustmentType: "Quantity Adjustment",
      educationLevel: item.educationLevel || "",
      itemCategory: item.category || "",
      description: item.description || "",
      materialType: item.material || "",
      itemType: item.itemType || "",
    });
  }, []);

  /**
   * Close Item Adjustment Modal
   */
  const closeAdjustmentModal = useCallback(() => {
    setAdjustmentModalState({ isOpen: false });
    setSelectedItem(null);
    setAdjustmentData({
      adjustmentType: "Quantity Adjustment",
      educationLevel: "",
      itemCategory: "",
      description: "",
      materialType: "",
      itemType: "",
    });
  }, []);

  return {
    items,
    filteredItems,
    paginatedItems,
    searchTerm,
    setSearchTerm,
    selectedItem,
    modalState,
    openAddModal,
    openEditModal,
    openViewModal,
    openDeleteModal,
    closeModal,
    addItem,
    updateItem,
    deleteItem,
    getStockStatus,
    // API state
    loading,
    error,
    fetchInventoryItems,
    // Pagination
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    // Filters
    educationLevelFilter,
    setEducationLevelFilter,
    itemTypeFilter,
    setItemTypeFilter,
    // Item Adjustment Modal
    adjustmentModalState,
    adjustmentData,
    setAdjustmentData,
    openAdjustmentModal,
    closeAdjustmentModal,
  };
};
