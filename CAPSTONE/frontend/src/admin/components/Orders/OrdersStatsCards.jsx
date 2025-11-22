import React from "react";
import {
  DollarSign,
  ClipboardList,
  GraduationCap,
  Users,
  PackageX,
  PackageCheck,
  Clock,
  CheckCircle,
} from "lucide-react";

/**
 * OrdersStatsCards Component
 *
 * Displays order statistics in multiple grid sections:
 * 
 * Section 1 (4-column grid):
 * - Cost Summary
 * - Status Overview
 * - Education Level Filter
 * - Class and Year Filter
 * 
 * Section 2 (2-column grid):
 * - Unreleased Quantity
 * - Released Quantity
 * 
 * Section 3 (2-column grid):
 * - Processing Count
 * - Claimed Count
 *
 * Props:
 * - stats: Object containing all statistics
 * - educationLevelFilter: Current education level filter value
 * - classAndYearFilter: Current class and year filter value
 * - onEducationLevelChange: Handler for education level filter change
 * - onClassAndYearChange: Handler for class and year filter change
 * - educationLevelOptions: Array of education level options
 * - classAndYearOptions: Array of class and year options (filtered)
 */
const OrdersStatsCards = ({
  stats,
  educationLevelFilter,
  classAndYearFilter,
  onEducationLevelChange,
  onClassAndYearChange,
  educationLevelOptions,
  classAndYearOptions,
}) => {
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: 4-Column Grid - Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cost Summary Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cost Summary</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalCost)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Status Overview Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Pending: <span className="font-semibold">{stats.pendingCount}</span>
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-700">
                  Done: <span className="font-semibold">{stats.completedCount}</span>
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Education Level Filter Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Education Level</p>
              <select
                value={educationLevelFilter}
                onChange={(e) => onEducationLevelChange(e.target.value)}
                className="w-full text-sm font-medium text-[#0C2340] border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#e68b00] focus:border-transparent"
              >
                {educationLevelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 ml-2">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Class and Year Filter Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Class & Year</p>
              <select
                value={classAndYearFilter}
                onChange={(e) => onClassAndYearChange(e.target.value)}
                className="w-full text-sm font-medium text-[#0C2340] border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#e68b00] focus:border-transparent"
              >
                <option value="All Class & Year">All Class & Year</option>
                {classAndYearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 ml-2">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 2-Column Grid - Quantity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Unreleased Quantity Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Unreleased Quantity</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.unreleasedQuantity}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Pending + Processing
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
              <PackageX className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Released Quantity Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Released Quantity</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.releasedQuantity}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Completed + Claimed
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: 2-Column Grid - Order Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Processing Count Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Processing</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.processingCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Orders being processed
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Claimed Count Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Claimed</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.claimedCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Orders picked up
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersStatsCards;

