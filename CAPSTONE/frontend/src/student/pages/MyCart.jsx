import React, { useState } from "react";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import Navbar from "../components/common/Navbar";
import Footer from "../../components/common/Footer";
import toast from "react-hot-toast";

/**
 * MyCart Component
 *
 * Student cart page displaying selected items with the following features:
 * - View all cart items with product details
 * - Edit mode to select and remove multiple items
 * - Update quantities with +/- controls
 * - Responsive design (mobile, tablet, desktop)
 * - No pricing displayed (uniforms are free for students)
 * - Order submission from cart
 */
const MyCart = () => {
  const navigate = useNavigate();
  const { items, loading, updateCartItem, removeFromCart, clearCart } = useCart();
  const [editMode, setEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Handle back navigation
  const handleBack = () => {
    navigate("/all-products");
  };

  // Toggle edit mode
  const handleEditToggle = () => {
    setEditMode(!editMode);
    if (editMode) {
      setSelectedItems([]); // Clear selections when exiting edit mode
    }
  };

  // Handle checkbox selection
  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.id));
    }
  };

  // Handle quantity update
  const handleQuantityChange = async (itemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;

    try {
      await updateCartItem(itemId, newQuantity);
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  // Handle remove selected items
  const handleRemoveSelected = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select items to remove");
      return;
    }

    try {
      // Remove all selected items
      await Promise.all(selectedItems.map((itemId) => removeFromCart(itemId)));
      setSelectedItems([]);
      setEditMode(false);
      toast.success(`${selectedItems.length} item(s) removed from cart`);
    } catch (error) {
      console.error("Failed to remove items:", error);
      toast.error("Failed to remove items");
    }
  };

  // Handle order now
  const handleOrderNow = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Navigate to order confirmation or checkout page
    // For now, we'll show a toast
    toast.success("Order functionality coming soon!");
    // TODO: Implement order submission from cart
  };

  // Empty cart state
  if (!loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Your cart is empty
              </h2>
              <p className="text-gray-600 mb-6">
                Start adding items to your cart to see them here
              </p>
              <button
                onClick={() => navigate("/all-products")}
                className="px-6 py-3 bg-[#e68b00] text-white rounded-lg hover:bg-[#d17d00] transition-colors font-medium"
              >
                Browse Products
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cart Container */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                {/* Back Button */}
                <button
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Back</span>
                </button>

                {/* Edit Button */}
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 text-sm font-medium text-[#0C2340] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {editMode ? "Done" : "Edit"}
                </button>
              </div>

              {/* Title and Item Count */}
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <span className="text-[#0C2340]">My</span>
                  <span className="text-[#e68b00]">Cart</span>
                </h1>
                <div className="flex items-center justify-center text-gray-600">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">
                    {items.length} {items.length === 1 ? "Item" : "Items"}
                  </span>
                </div>
              </div>

              {/* Edit Mode Actions */}
              {editMode && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-[#0C2340] hover:underline font-medium"
                  >
                    {selectedItems.length === items.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                  {selectedItems.length > 0 && (
                    <button
                      onClick={handleRemoveSelected}
                      className="flex items-center text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove ({selectedItems.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Product List - Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {editMode && <th className="w-12 px-6 py-4"></th>}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      {/* Checkbox */}
                      {editMode && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="w-5 h-5 text-[#e68b00] border-gray-300 rounded focus:ring-[#e68b00]"
                          />
                        </td>
                      )}

                      {/* Product Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={item.inventory?.image || "/assets/image/card1.png"}
                            alt={item.inventory?.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = "/assets/image/card1.png";
                            }}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.inventory?.name}
                            </p>
                            <p className="text-sm text-[#e68b00]">
                              ({item.inventory?.education_level})
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-6 py-4">
                        <span className="text-gray-700">{item.size}</span>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4">
                        {editMode ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity, -1)
                              }
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-4 h-4 text-gray-700" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity, 1)
                              }
                              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-700">{item.quantity}</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-green-600">Free</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Product List - Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Checkbox */}
                    {editMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="mt-1 w-5 h-5 text-[#e68b00] border-gray-300 rounded focus:ring-[#e68b00]"
                      />
                    )}

                    {/* Product Image */}
                    <img
                      src={item.inventory?.image || "/assets/image/card1.png"}
                      alt={item.inventory?.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        e.target.src = "/assets/image/card1.png";
                      }}
                    />

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {item.inventory?.name}
                      </h3>
                      <p className="text-sm text-[#e68b00] mb-2">
                        ({item.inventory?.education_level})
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Size:</span> {item.size}
                        </div>
                        <span className="font-semibold text-green-600">Free</span>
                      </div>

                      {/* Quantity Controls */}
                      {editMode ? (
                        <div className="flex items-center space-x-2 mt-3">
                          <button
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity, -1)
                            }
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4 text-gray-700" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity, 1)
                            }
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Qty:</span> {item.quantity}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer - Order Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button
                onClick={handleOrderNow}
                disabled={items.length === 0 || loading}
                className="w-full py-4 bg-[#e68b00] text-white font-semibold rounded-lg hover:bg-[#d17d00] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Order Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyCart;

