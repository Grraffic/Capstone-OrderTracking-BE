import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./AuthContext";

const InventoryContext = createContext();

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
};

// Inventory reducer
const inventoryReducer = (state, action) => {
  switch (action.type) {
    case "SET_INVENTORY":
      return {
        ...state,
        items: action.payload,
        loading: false,
      };
    case "ADD_ITEM":
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };
    case "DELETE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "UPDATE_STOCK":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, currentStock: action.payload.newStock }
            : item
        ),
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

const initialState = {
  items: [],
  loading: false,
  error: null,
};

export const InventoryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);
  const { user, userRole, USER_ROLES } = useAuth();

  useEffect(() => {
    // Only admins can access inventory management
    if (user && userRole === USER_ROLES.ADMIN) {
      fetchInventory();
    }
  }, [user, userRole]);

  const fetchInventory = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      // Mock API call - replace with actual API
      const mockInventory = [
        {
          id: "INV-001",
          name: "PE Uniform - Size S",
          category: "PE Uniform",
          size: "S",
          currentStock: 25,
          minStock: 20,
          maxStock: 100,
          price: 0, // Free for students
          qrCode: "QR-PE-S-001",
          location: "Stockroom A-1",
          lastUpdated: "2024-01-15T10:30:00Z",
        },
        {
          id: "INV-002",
          name: "PE Uniform - Size M",
          category: "PE Uniform",
          size: "M",
          currentStock: 5,
          minStock: 20,
          maxStock: 100,
          price: 0,
          qrCode: "QR-PE-M-002",
          location: "Stockroom A-1",
          lastUpdated: "2024-01-15T10:30:00Z",
        },
        {
          id: "INV-003",
          name: "Regular Uniform - Size L",
          category: "Regular Uniform",
          size: "L",
          currentStock: 3,
          minStock: 15,
          maxStock: 80,
          price: 0,
          qrCode: "QR-REG-L-003",
          location: "Stockroom A-2",
          lastUpdated: "2024-01-15T10:30:00Z",
        },
        {
          id: "INV-004",
          name: "Foundation Week Shirt - Size M",
          category: "Event Merchandise",
          size: "M",
          currentStock: 50,
          minStock: 10,
          maxStock: 200,
          price: 350,
          qrCode: "QR-FW-M-004",
          location: "PSAS Office",
          lastUpdated: "2024-01-15T10:30:00Z",
        },
        {
          id: "INV-005",
          name: "ICT Week Shirt - Size L",
          category: "Event Merchandise",
          size: "L",
          currentStock: 30,
          minStock: 10,
          maxStock: 150,
          price: 300,
          qrCode: "QR-ICT-L-005",
          location: "ICT Department",
          lastUpdated: "2024-01-15T10:30:00Z",
        },
      ];

      dispatch({ type: "SET_INVENTORY", payload: mockInventory });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
    }
  };

  const addInventoryItem = async (itemData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const newItem = {
        id: `INV-${Date.now()}`,
        ...itemData,
        qrCode: `QR-${itemData.category.replace(/\s+/g, "-").toUpperCase()}-${
          itemData.size
        }-${Date.now()}`,
        lastUpdated: new Date().toISOString(),
      };

      dispatch({ type: "ADD_ITEM", payload: newItem });
      dispatch({ type: "SET_LOADING", payload: false });

      return newItem;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const updateInventoryItem = async (itemId, updates) => {
    try {
      const updatedItem = {
        ...updates,
        id: itemId,
        lastUpdated: new Date().toISOString(),
      };

      dispatch({ type: "UPDATE_ITEM", payload: updatedItem });
      return updatedItem;
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const updateStock = async (itemId, newStock, reason = "") => {
    try {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      dispatch({ type: "UPDATE_STOCK", payload: { id: itemId, newStock } });

      // Log stock change (in real app, this would be sent to backend)
      console.log(
        `Stock updated for ${item.name}: ${item.currentStock} -> ${newStock}. Reason: ${reason}`
      );

      return { ...item, currentStock: newStock };
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const deleteInventoryItem = async (itemId) => {
    try {
      dispatch({ type: "DELETE_ITEM", payload: itemId });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error.message });
      throw error;
    }
  };

  const getLowStockItems = () => {
    return state.items.filter((item) => item.currentStock <= item.minStock);
  };

  const getItemsByCategory = (category) => {
    return state.items.filter((item) => item.category === category);
  };

  const getItemByQRCode = (qrCode) => {
    return state.items.find((item) => item.qrCode === qrCode);
  };

  const getInventoryStats = () => {
    const totalItems = state.items.length;
    const lowStockItems = getLowStockItems().length;
    const totalValue = state.items.reduce(
      (sum, item) => sum + item.currentStock * item.price,
      0
    );
    const categories = [...new Set(state.items.map((item) => item.category))];

    return {
      totalItems,
      lowStockItems,
      totalValue,
      categoriesCount: categories.length,
      categories,
    };
  };

  const searchItems = (query) => {
    const lowercaseQuery = query.toLowerCase();
    return state.items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowercaseQuery) ||
        item.category.toLowerCase().includes(lowercaseQuery) ||
        item.qrCode.toLowerCase().includes(lowercaseQuery)
    );
  };

  const generateQRCode = (itemId) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");

    return {
      type: "inventory",
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      size: item.size,
      qrCode: item.qrCode,
      timestamp: new Date().toISOString(),
    };
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const value = {
    items: state.items,
    loading: state.loading,
    error: state.error,
    addInventoryItem,
    updateInventoryItem,
    updateStock,
    deleteInventoryItem,
    getLowStockItems,
    getItemsByCategory,
    getItemByQRCode,
    getInventoryStats,
    searchItems,
    generateQRCode,
    fetchInventory,
    clearError,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
