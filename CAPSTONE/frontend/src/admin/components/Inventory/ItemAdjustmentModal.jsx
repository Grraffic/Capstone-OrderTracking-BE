import { Pencil, Plus } from "lucide-react";
import { useItemAdjustmentForm } from "../../hooks";

const ItemAdjustmentModal = ({ isOpen, selectedItem, onClose, onSubmit }) => {
  const {
    formData,
    errors,
    adjustmentType,
    imagePreview,
    isDragging,
    handleInputChange,
    handleAdjustmentTypeChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    handleSubmit,
  } = useItemAdjustmentForm(selectedItem, onSubmit, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <Pencil className="text-gray-700" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">
              Add Inventory Item
            </h2>
          </div>
        </div>

        {/* Adjustment Type */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            Adjustment Type
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAdjustmentTypeChange("Inventory Threshold")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                adjustmentType === "Inventory Threshold"
                  ? "bg-blue-900 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Inventory Threshold
            </button>
            <button
              type="button"
              onClick={() => handleAdjustmentTypeChange("Item Details")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                adjustmentType === "Item Details"
                  ? "bg-blue-900 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Item Details
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
            {/* Left Panel */}
            <div className="lg:col-span-2 bg-white p-6 space-y-5">
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
                      <Plus size={28} className="mx-auto text-gray-400 mb-2" />
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
                  <p className="text-red-500 text-xs mt-1">{errors.image}</p>
                )}
              </div>

              {/* Input Fields */}
              {[
                [
                  "Education Level",
                  "educationLevel",
                  [
                    "Kindergarten",
                    "Grade 1",
                    "Grade 2",
                    "Grade 3",
                    "Grade 4",
                    "Grade 5",
                    "Grade 6",
                    "Grade 7",
                    "Grade 8",
                    "Grade 9",
                    "Grade 10",
                    "Grade 11",
                    "Grade 12",
                  ],
                ],
                [
                  "Item Category",
                  "itemCategory",
                  [
                    "Kinder Dress",
                    "Kinder Shorts",
                    "Necktie",
                    "Shirt",
                    "Pants",
                    "Skirt",
                    "Blouse",
                  ],
                ],
                [
                  "Size",
                  "size",
                  [
                    "XSmall",
                    "Small",
                    "Medium",
                    "Large",
                    "XLarge",
                    "2XLarge",
                    "3XLarge",
                  ],
                ],
                [
                  "Description",
                  "description",
                  ["Regular Fit", "Slim Fit", "Loose Fit", "Standard"],
                ],
                [
                  "Item Type",
                  "itemType",
                  ["Uniform", "Accessories", "PE Uniform"],
                ],
              ].map(([label, name, options]) => (
                <div key={name} className="flex items-start gap-4">
                  <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                    {label}
                  </label>
                  <div className="flex-1">
                    <select
                      name={name}
                      value={formData[name]}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose {label.toLowerCase()}</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {errors[name] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[name]}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Unit Price */}
              <div className="flex items-start gap-4">
                <label className="text-sm font-medium text-gray-700 pt-2.5 w-32 flex-shrink-0">
                  Unit Price (₱)
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    placeholder="Enter unit price"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.unitPrice && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.unitPrice}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="bg-gray-50 p-6 border-l border-gray-200">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Item Detail
                </h4>
                <div className="bg-white rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Item preview"
                      className="mx-auto w-24 h-24 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="mx-auto w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <Plus size={24} className="text-gray-400" />
                    </div>
                  )}

                  <div className="mt-4 text-sm text-left">
                    <p className="text-gray-600 font-medium">Item Category</p>
                    <p className="text-gray-900 mb-2">
                      {formData.itemCategory || "—"}
                    </p>
                    <p className="text-gray-600 font-medium">Size</p>
                    <p className="text-gray-900">{formData.size || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 mt-6 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Item Details History
                </h4>
                <div className="bg-white rounded-lg p-4 text-center text-gray-500 text-sm">
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

export default ItemAdjustmentModal;
