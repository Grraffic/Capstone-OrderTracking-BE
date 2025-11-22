import React, { useState } from "react";
import { MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * OrdersTable Component
 *
 * Displays a comprehensive table of all orders with:
 * - Checkbox selection
 * - Transaction number
 * - Item ordered (with "more items" indicator)
 * - Size/Description
 * - Customer name
 * - Grade or Program
 * - Transaction date
 * - Action menu
 * - Pagination controls (Previous/Next buttons)
 *
 * Reuses the same design and layout as RecentOrdersTable from Dashboard
 *
 * Props:
 * - orders: Array of order objects to display
 * - currentPage: Current page number
 * - totalPages: Total number of pages
 * - onPrevPage: Handler for previous page button
 * - onNextPage: Handler for next page button
 * - onGoToPage: Handler for going to specific page
 */
const OrdersTable = ({
  orders,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onGoToPage,
}) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === orders.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(orders.map((order) => order.id)));
    }
  };

  // Handle empty state
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
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
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Orders Found
          </h3>
          <p className="text-gray-500">
            There are no orders to display at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedRows.size === orders.length && orders.length > 0
                  }
                  onChange={toggleAllRows}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                Transaction no.
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                Item Ordered
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                Size
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                Grade or Program
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#0C2340]">
                Transaction Date
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-[#0C2340]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr
                key={order.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  index === orders.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(order.id)}
                    onChange={() => toggleRowSelection(order.id)}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-[#0C2340] font-medium">
                  {order.transactionNo}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[#0C2340] font-medium">
                    {order.itemOrdered}
                  </div>
                  {order.moreItems && (
                    <div className="text-xs text-gray-500">
                      {order.moreItems}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.description || order.size || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.gradeOrProgram}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.transactionDate}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === order.id ? null : order.id)
                      }
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      aria-label="Order actions"
                    >
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === order.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => {
                            console.log("View order:", order.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            console.log("Edit order:", order.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Edit Order
                        </button>
                        <button
                          onClick={() => {
                            console.log("Update status:", order.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg transition-colors"
                        >
                          Update Status
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
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

export default OrdersTable;

