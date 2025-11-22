import React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Discard Changes Confirmation Modal
 *
 * Displays a confirmation dialog when user attempts to discard changes
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onConfirm - Callback when user confirms discard
 * @param {function} onCancel - Callback when user cancels discard
 */
const DiscardChangesModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onCancel}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 transform transition-all">
        {/* Message */}
        <p className="text-gray-600 text-center mb-8">
          Are you sure you want to discard changes?{" "}
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            No
          </button>

          {/* Confirm Button */}
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-[#e68b00] text-white font-semibold rounded-lg hover:bg-[#d97a1f] transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscardChangesModal;
