import React from "react";
import { Check } from "lucide-react";

/**
 * SizeSelector Component
 *
 * Displays size selection buttons with measurements
 * Handles size selection and confirmation
 */
const SizeSelector = ({
  availableSizes,
  selectedSize,
  onSizeSelect,
  sizeConfirmed,
  onSizeConfirm,
}) => {
  // Size measurement guide
  const sizeMeasurements = {
    XS: { chest: "32-34", length: "24-26" },
    S: { chest: "34-36", length: "26-28" },
    M: { chest: "38-40", length: "28-30" },
    L: { chest: "42-44", length: "30-32" },
    XL: { chest: "46-48", length: "32-34" },
    XXL: { chest: "50-52", length: "34-36" },
  };

  if (!availableSizes || availableSizes.length === 0) {
    return null;
  }

  // Don't show size selector for items that don't need sizes
  if (availableSizes.length === 1 && availableSizes[0] === "N/A") {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Size Choices Label */}
      <div>
        <h3 className="text-base font-bold text-[#F28C28] mb-3">
          Size Choices:
        </h3>

        {/* Size Buttons */}
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => {
            const isSelected = selectedSize === size;
            return (
              <button
                key={size}
                onClick={() => onSizeSelect(size)}
                className={`relative px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isSelected
                    ? "bg-gray-100 text-[#003363] border-2 border-gray-300"
                    : "bg-white text-gray-700 border-2 border-gray-300 hover:border-[#F28C28]"
                } ${
                  sizeConfirmed && isSelected ? "ring-2 ring-green-500" : ""
                }`}
              >
                {size}
                {sizeConfirmed && isSelected && (
                  <Check className="inline-block ml-1 w-4 h-4" />
                )}
                {/* Orange/Yellow left border for selected size (vertical) */}
                {isSelected && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#CB7B00] rounded-l-lg"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Measurements */}
      {selectedSize && sizeMeasurements[selectedSize] && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-[#003363] mb-2">
            Size {selectedSize} Measurements:
          </h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Chest:</span>{" "}
              {sizeMeasurements[selectedSize].chest} in (
              {(
                parseFloat(sizeMeasurements[selectedSize].chest.split("-")[0]) *
                2.54
              ).toFixed(1)}
              -
              {(
                parseFloat(sizeMeasurements[selectedSize].chest.split("-")[1]) *
                2.54
              ).toFixed(1)}{" "}
              cm)
            </p>
            <p>
              <span className="font-medium">Shirt Length:</span>{" "}
              {sizeMeasurements[selectedSize].length} in (
              {(
                parseFloat(
                  sizeMeasurements[selectedSize].length.split("-")[0]
                ) * 2.54
              ).toFixed(1)}
              -
              {(
                parseFloat(
                  sizeMeasurements[selectedSize].length.split("-")[1]
                ) * 2.54
              ).toFixed(1)}{" "}
              cm)
            </p>
          </div>
        </div>
      )}

      {/* Size Confirmation Checkbox */}
      {selectedSize && !sizeConfirmed && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <input
            type="checkbox"
            id="size-confirm"
            className="mt-1 w-4 h-4 text-[#F28C28] border-gray-300 rounded focus:ring-[#F28C28]"
            onChange={(e) => {
              if (e.target.checked && onSizeConfirm) {
                onSizeConfirm();
              }
            }}
          />
          <label
            htmlFor="size-confirm"
            className="text-sm text-gray-700 cursor-pointer"
          >
            I confirm that the size is correct
          </label>
        </div>
      )}

      {/* Size Confirmed Message */}
      {selectedSize && sizeConfirmed && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            Size {selectedSize} confirmed! You can now proceed with your order.
          </span>
        </div>
      )}
    </div>
  );
};

export default SizeSelector;
