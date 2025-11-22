import { useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * InventoryTable Component
 *
 * Displays inventory items in a responsive table with:
 * - Product image thumbnails
 * - Product details (name, category, stock, price, status)
 * - Action buttons (View, Edit, Delete)
 * - Status badges with color coding
 * - Pagination controls
 *
 * Props:
 * - items: Array of inventory items
 * - onView: Function to handle view action
 * - onEdit: Function to handle edit action
 * - onDelete: Function to handle delete action
 * - onAdjustment: Function to handle item adjustment
 * - currentPage: Current page number
 * - totalPages: Total number of pages
 * - onNextPage: Function to go to next page
 * - onPrevPage: Function to go to previous page
 * - onGoToPage: Function to go to specific page
 */
const InventoryTable = ({
  items = [],
  onView,
  onEdit,
  onDelete,
  onAdjustment,
  currentPage = 1,
  totalPages = 1,
  onNextPage,
  onPrevPage,
  onGoToPage,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  /**
   * Get status badge color based on status
   * @param {string} status - Item status
   * @returns {string} - Tailwind CSS classes
   */
  const getStatusColor = (status) => {
    switch (status) {
      case "Above Threshold":
        return "bg-green-100 text-green-800";
      case "At Reorder Point":
        return "bg-yellow-100 text-yellow-800";
      case "Critical":
        return "bg-orange-100 text-orange-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Container with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                No.
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Education Level
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Item Category
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Description/Size
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Material/Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Item Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Inventory
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <p className="text-sm font-medium">
                      No inventory items found
                    </p>
                    <p className="text-xs">
                      Add your first item to get started
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Number */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>

                  {/* Image */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-md border border-gray-200"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/48";
                      }}
                    />
                  </td>

                  {/* Education Level */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.educationLevel}
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category}
                  </td>

                  {/* Description/Size */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.description}
                  </td>

                  {/* Material/Type */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.material || "-"}
                  </td>

                  {/* Item Type */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.itemType}
                  </td>

                  {/* Stock */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.stock} in stocks
                  </td>

                  {/* Status - Editable dropdown */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer ${getStatusColor(
                        item.status
                      )}`}
                      value={item.status}
                      onChange={(e) => {
                        // Status change can be handled here if needed
                        console.log("Status changed:", e.target.value);
                      }}
                    >
                      <option value="Above Threshold">Above Threshold</option>
                      <option value="At Reorder Point">At Reorder Point</option>
                      <option value="Critical">Critical</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Button */}
                      <button
                        onClick={() => onView(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View details"
                        aria-label="View item"
                      >
                        <Eye size={18} />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit item"
                        aria-label="Edit item"
                      >
                        <Pencil size={18} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDelete(item)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete item"
                        aria-label="Delete item"
                      >
                        <Trash2 size={18} />
                      </button>

                      {/* More Options Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === item.id ? null : item.id
                            )
                          }
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="More options"
                          aria-label="More options"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === item.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                onEdit(item);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg transition-colors flex items-center gap-2"
                            >
                              <Pencil size={16} />
                              Edit Item
                            </button>
                            <button
                              onClick={() => {
                                onAdjustment(item);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg transition-colors flex items-center gap-2"
                            >
                              <MoreVertical size={16} />
                              Item Adjustment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls - Always visible */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* Left: Page Indicator */}
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            onClick={onPrevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-[#e68b00] hover:text-white hover:border-[#e68b00] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-300 transition-colors flex items-center gap-1 font-medium text-sm"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
            <span>Previous</span>
          </button>

          {/* Next Button */}
          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-[#e68b00] hover:text-white hover:border-[#e68b00] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-300 transition-colors flex items-center gap-1 font-medium text-sm"
            title="Next page"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;
