import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { cartAPI } from "../services/api";
import toast from "react-hot-toast";

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

// Cart reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case "SET_CART_ITEMS":
      return {
        ...state,
        items: action.payload,
        loading: false,
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
    case "ADD_ITEM":
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "CLEAR_CART":
      return {
        ...state,
        items: [],
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

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useAuth();

  // Fetch cart items when user logs in
  useEffect(() => {
    if (user?.id) {
      fetchCartItems();
    } else {
      // Clear cart when user logs out
      dispatch({ type: "CLEAR_CART" });
    }
  }, [user?.id]);

  /**
   * Fetch all cart items for the current user
   */
  const fetchCartItems = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await cartAPI.getCartItems(user.id);

      if (response.data.success) {
        dispatch({ type: "SET_CART_ITEMS", payload: response.data.data });
      }
    } catch (error) {
      console.error("Fetch cart items error:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      toast.error("Failed to load cart items");
    }
  };

  /**
   * Add item to cart
   * @param {Object} item - Item to add { inventoryId, size, quantity }
   */
  const addToCart = async (item) => {
    try {
      if (!user?.id) {
        toast.error("Please login to add items to cart");
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });

      const cartData = {
        userId: user.id,
        inventoryId: item.inventoryId,
        size: item.size,
        quantity: item.quantity || 1,
      };

      const response = await cartAPI.addToCart(cartData);

      if (response.data.success) {
        // Refresh cart items to get updated data
        await fetchCartItems();
        toast.success(response.data.message || "Item added to cart");
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      toast.error(
        error.response?.data?.message || "Failed to add item to cart"
      );
    }
  };

  /**
   * Update cart item quantity
   * @param {string} cartItemId - Cart item ID
   * @param {number} quantity - New quantity
   */
  const updateCartItem = async (cartItemId, quantity) => {
    try {
      if (!user?.id) {
        toast.error("Please login to update cart");
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });

      const response = await cartAPI.updateCartItem(
        cartItemId,
        user.id,
        quantity
      );

      if (response.data.success) {
        // Refresh cart items
        await fetchCartItems();
        toast.success("Cart updated");
      }
    } catch (error) {
      console.error("Update cart item error:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      toast.error(
        error.response?.data?.message || "Failed to update cart item"
      );
    }
  };

  /**
   * Remove item from cart
   * @param {string} cartItemId - Cart item ID
   */
  const removeFromCart = async (cartItemId) => {
    try {
      if (!user?.id) {
        toast.error("Please login to remove items from cart");
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });

      const response = await cartAPI.removeFromCart(cartItemId, user.id);

      if (response.data.success) {
        dispatch({ type: "REMOVE_ITEM", payload: cartItemId });
        toast.success("Item removed from cart");
      }
    } catch (error) {
      console.error("Remove from cart error:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      toast.error(
        error.response?.data?.message || "Failed to remove item from cart"
      );
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  /**
   * Clear entire cart
   */
  const clearCart = async () => {
    try {
      if (!user?.id) {
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });

      const response = await cartAPI.clearCart(user.id);

      if (response.data.success) {
        dispatch({ type: "CLEAR_CART" });
        toast.success("Cart cleared");
      }
    } catch (error) {
      console.error("Clear cart error:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
      toast.error(error.response?.data?.message || "Failed to clear cart");
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  /**
   * Get cart item count
   */
  const getCartCount = () => {
    return state.items.length;
  };

  /**
   * Get total quantity of all items
   */
  const getTotalQuantity = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    items: state.items,
    loading: state.loading,
    error: state.error,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCartItems,
    getCartCount,
    getTotalQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
