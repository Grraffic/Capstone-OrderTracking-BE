import { X, AlertTriangle, Pencil, Plus } from "lucide-react";
import { useInventoryModalForm } from "../../hooks";
import { useState, useMemo } from "react";
import {
  EDUCATION_LEVELS,
  ITEM_TYPES,
  MATERIAL_TYPES,
  getFilteredCategories,
} from "../../constants/inventoryOptions";

/**
 * InventoryModals Component
 *
 * Handles all modal dialogs for inventory management:
 * - Add Item Modal (form to add new item with 2-column layout)
 * - Edit Item Modal (form to edit existing item)
 * - View Item Modal (read-only view of item details)
 * - Delete Confirmation Modal (confirmation dialog)
 *
 * Props:
 * - modalState: Object with { isOpen, mode }
 * - selectedItem: Currently selected item (for edit/view/delete)
 * - onClose: Function to close modal
 * - onAdd: Function to add new item
 * - onUpdate: Function to update item
 * - onDelete: Function to delete item
 */
const InventoryModals = ({
  modalState,
  selectedItem,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [focusedSection, setFocusedSection] = useState(null);

  const {
    formData,
    errors,
    adjustmentType,
    imagePreview,
    isDragging,
    handleInputChange,
    handleAdjustmentTypeChange,
    handleImageUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    handleSubmit: handleFormSubmit,
  } = useInventoryModalForm(
    modalState.mode === "edit" ? selectedItem : null,
    (data) => {
      if (modalState.mode === "add") {
        onAdd(data);
      } else if (modalState.mode === "edit") {
        onUpdate(data);
      }
    },
    onClose,
    modalState
  );

  // Get filtered categories based on selected education level
  const filteredCategories = useMemo(() => {
    return getFilteredCategories(formData.educationLevel);
  }, [formData.educationLevel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleFormSubmit(e);
  };

  if (!modalState.isOpen) return null;

  // Delete Confirmation Modal
  if (modalState.mode === "delete") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Item
              </h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-gray-700 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedItem?.name}</span>
            {selectedItem?.description && (
              <span> ({selectedItem.description})</span>
            )}
            ? This will permanently remove the item from your inventory.
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(selectedItem.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Item
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View Item Modal
  if (modalState.mode === "view") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#0C2340]">
              Item Details
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image */}
              <div className="flex-shrink-0">
                <img
                  src={selectedItem?.image}
                  alt={selectedItem?.name}
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/192";
                  }}
                />
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Education Level
                    </label>
                    <p className="text-gray-900">
                      {selectedItem?.educationLevel}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Category
                    </label>
                    <p className="text-gray-900">{selectedItem?.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Size
                    </label>
                    <p className="text-gray-900">
                      {selectedItem?.description || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Description
                    </label>
                    <p className="text-gray-900">
                      {selectedItem?.material || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Item Type
                    </label>
                    <p className="text-gray-900">{selectedItem?.itemType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Stock
                    </label>
                    <p className="text-gray-900">{selectedItem?.stock} units</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Price
                  </label>
                  <p className="text-2xl font-bold text-[#e68b00]">
                    ₱{selectedItem?.price.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedItem?.status === "Above Threshold"
                        ? "bg-green-100 text-green-800"
                        : selectedItem?.status === "At Reorder Point"
                        ? "bg-yellow-100 text-yellow-800"
                        : selectedItem?.status === "Critical"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedItem?.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0C2340] text-white rounded-lg hover:bg-[#0a1d33] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add/Edit Item Modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Content - 2 Column Layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
            {/* Left Column - Add Inventory Item */}
            <div className="bg-white p-6 border-r border-gray-200 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Pencil size={18} />
                  Add Inventory Item
                </h3>

                {/* Adjustment Type - Radio Buttons */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Adjustment Type
                  </label>
                  <div className="flex gap-3">
                    <label
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        adjustmentType === "Inventory Threshold"
                          ? "bg-[#003363] border-blue-900"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="Inventory Threshold"
                        checked={adjustmentType === "Inventory Threshold"}
                        onChange={() =>
                          handleAdjustmentTypeChange("Inventory Threshold")
                        }
                        className="w-5 h-5 text-blue-900 border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm font-medium ${
                          adjustmentType === "Inventory Threshold"
                            ? "text-[#f3f3f3]"
                            : "text-gray-700"
                        }`}
                      >
                        Inventory Threshold
                      </span>
                    </label>
                    <label
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        adjustmentType === "Item Details"
                          ? "bg-[#003363] border-blue-900"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="Item Details"
                        checked={adjustmentType === "Item Details"}
                        onChange={() =>
                          handleAdjustmentTypeChange("Item Details")
                        }
                        className="w-5 h-5 text-blue-900 border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm font-medium ${
                          adjustmentType === "Item Details"
                            ? "text-[#f3f3f3]"
                            : "text-gray-700"
                        }`}
                      >
                        Item Details
                      </span>
                    </label>
                  </div>
                </div>

                {/* Form Fields - Item Details */}
                {adjustmentType === "Item Details" && (
                  <div
                    className={`space-y-5 p-4 rounded-lg transition-colors duration-200 ${
                      focusedSection === "Item Details" ? "bg-blue-50" : ""
                    }`}
                    onFocus={() => setFocusedSection("Item Details")}
                    onBlur={() => setFocusedSection(null)}
                  >
                    {/* Image Upload */}
                    <div className="text-center">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleBrowseClick}
                        className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition ${
                          isDragging
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="mx-auto max-h-40 rounded-lg"
                          />
                        ) : (
                          <>
                            <Plus
                              size={28}
                              className="mx-auto text-gray-400 mb-2"
                            />
                            <p className="text-sm text-gray-600">
                              Drag image here or{" "}
                              <span className="text-blue-600 font-medium">
                                Browse image
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                      {errors.image && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.image}
                        </p>
                      )}
                    </div>

                    {/* Education Level */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Education Level
                      </label>
                      <div className="flex-1">
                        <select
                          name="educationLevel"
                          value={formData.educationLevel}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Education Level</option>
                          {EDUCATION_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                        {errors.educationLevel && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.educationLevel}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Item Category
                      </label>
                      <div className="flex-1">
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Item Category</option>
                          {filteredCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                        {errors.category && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.category}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Size */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Size
                      </label>
                      <div className="flex-1">
                        <input
                          type="text"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Small, Medium, Large"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Description
                      </label>
                      <div className="flex-1">
                        <input
                          type="text"
                          name="descriptionText"
                          value={formData.descriptionText}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    {/* Material/Type */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Material/Type
                      </label>
                      <div className="flex-1">
                        <select
                          name="material"
                          value={formData.material}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Material/Type</option>
                          {MATERIAL_TYPES.map((material) => (
                            <option key={material.value} value={material.value}>
                              {material.label}
                            </option>
                          ))}
                        </select>
                        {errors.material && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.material}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Item Type */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Item Type
                      </label>
                      <div className="flex-1">
                        <select
                          name="itemType"
                          value={formData.itemType}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Item Type</option>
                          {ITEM_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {errors.itemType && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.itemType}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock Quantity */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Stock Quantity
                      </label>
                      <div className="flex-1">
                        <input
                          type="number"
                          name="stock"
                          value={formData.stock}
                          onChange={handleInputChange}
                          required
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                        {errors.stock && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.stock}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-start gap-4">
                      <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                        Unit Price (₱)
                      </label>
                      <div className="flex-1">
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                        {errors.price && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.price}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Threshold Form */}
                {adjustmentType === "Inventory Threshold" && (
                  <div
                    className={`space-y-5 p-4 rounded-lg transition-colors duration-200 ${
                      focusedSection === "Inventory Threshold"
                        ? "bg-blue-50"
                        : ""
                    }`}
                    onFocus={() => setFocusedSection("Inventory Threshold")}
                    onBlur={() => setFocusedSection(null)}
                  >
                    {/* Three Fields Row: Physical Count, Available, Reorder Point */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Physical Count */}
                      <div>
                        <label
                          htmlFor="physicalCount"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Physical Count
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="physicalCount"
                            name="physicalCount"
                            value={formData.physicalCount || ""}
                            onChange={handleInputChange}
                            placeholder="0"
                            min="0"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              errors.physicalCount
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            Unit
                          </span>
                        </div>
                        {errors.physicalCount && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.physicalCount}
                          </p>
                        )}
                      </div>

                      {/* Available */}
                      <div>
                        <label
                          htmlFor="available"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Available
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="available"
                            name="available"
                            value={formData.available || ""}
                            onChange={handleInputChange}
                            placeholder="0"
                            min="0"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              errors.available
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            Unit
                          </span>
                        </div>
                        {errors.available && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.available}
                          </p>
                        )}
                      </div>

                      {/* Reorder Point */}
                      <div>
                        <label
                          htmlFor="reorderPoint"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Reorder Point
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="reorderPoint"
                            name="reorderPoint"
                            value={formData.reorderPoint || ""}
                            onChange={handleInputChange}
                            placeholder="0"
                            min="0"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              errors.reorderPoint
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            Unit
                          </span>
                        </div>
                        {errors.reorderPoint && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.reorderPoint}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Note Section */}
                    <div>
                      <label
                        htmlFor="note"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Note
                      </label>
                      <textarea
                        id="note"
                        name="note"
                        value={formData.note || ""}
                        onChange={handleInputChange}
                        placeholder="Add notes or comments about this inventory adjustment..."
                        rows="6"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                          errors.note ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {errors.note && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.note}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Item Detail Preview */}
            <div className="bg-gray-50 p-6 border-l border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Item Detail
              </h3>

              {/* Item Preview Card */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                {/* Image Preview */}
                <div className="mb-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Item preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300";
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <Plus
                          size={32}
                          className="mx-auto text-gray-400 mb-2"
                        />
                        <span className="text-gray-400 text-sm">
                          No image selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Item Category</p>
                    <p className="text-gray-900">{formData.category || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Size</p>
                    <p className="text-gray-900">
                      {formData.description || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Item Type</p>
                    <p className="text-gray-900">{formData.itemType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Price</p>
                    <p className="text-lg font-bold text-[#e68b00]">
                      ₱{Number(formData.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Item Details History */}
              <div className="border-t border-gray-300 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Item Details History
                </h4>
                <div className="bg-white rounded-lg p-4 text-center text-gray-500 text-sm border border-gray-200">
                  <p>No history records yet</p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition font-medium"
          >
            Back
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryModals;
