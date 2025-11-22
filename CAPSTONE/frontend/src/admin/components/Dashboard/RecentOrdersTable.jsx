import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, ChevronRight } from "lucide-react";

/**
 * RecentOrdersTable Component
 *
 * Displays a table of recent orders with:
 * - Transaction number
 * - Item ordered
 * - Description/Size
 * - Customer name
 * - Grade or program
 * - Transaction date
 * - Action menu
 */
const RecentOrdersTable = ({ orders }) => {
  const navigate = useNavigate();
  const [selectedRows, setSelectedRows] = useState(new Set());

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
                Description/Size
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
                  <div className="text-xs text-gray-500">{order.moreItems}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {order.description}
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
                  <button
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Order actions"
                  >
                    <MoreVertical size={18} className="text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* See More Button */}
      <div className="px-6 py-4 flex justify-end">
        <button
          onClick={() => navigate("/admin/orders")}
          className="bg-[#e68b00] hover:bg-[#d97706] text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          See More
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default RecentOrdersTable;
