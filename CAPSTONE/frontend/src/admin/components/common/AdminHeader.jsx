import React from "react";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

/**
 * AdminHeader Component
 *
 * Displays the top header of the admin dashboard with:
 * - Menu toggle button for sidebar
 * - Department name
 * - Notification bell
 * - User profile section (responsive)
 *
 * Props:
 * - onMenuToggle: Function to toggle sidebar
 * - sidebarOpen: Boolean indicating if sidebar is open
 */
const AdminHeader = ({ onMenuToggle, sidebarOpen = true }) => {
  const { user } = useAuth();

  const displayName = user?.displayName || user?.name || "Admin";
  const userEmail = user?.email || "";
  // Use Cloudinary URL from user profile, fallback to placeholder
  const userAvatar = user?.photoURL || "/default-avatar.png";

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between z-40 transition-all duration-300 ${
        sidebarOpen ? "left-64" : "left-20"
      }`}
    >
      {/* Left side - Menu toggle and department name */}
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          onClick={onMenuToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} className="text-[#0C2340]" />
        </button>

        <h2 className="text-base sm:text-lg font-semibold text-[#0C2340] truncate max-w-[120px] sm:max-w-none">
          Finance and Accounting Department
        </h2>
      </div>

      {/* Right side - Notifications and user profile */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Notification bell */}
        <button
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell size={22} className="text-[#0C2340]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User profile section */}
        <div className="flex items-center gap-2 sm:gap-3 pl-4 sm:pl-6 border-l border-gray-200">
          {/* Hide name/email on small screens */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-[#0C2340]">
              {displayName}
            </span>
            {userEmail && (
              <span className="text-xs text-gray-500">{userEmail}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <img
              src={userAvatar}
              alt={displayName}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#e68b00]"
            />
            <button
              className="hidden sm:block p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="User menu"
            >
              <ChevronDown size={18} className="text-[#0C2340]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
