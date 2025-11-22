import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";

const UserProfile = () => {
  const { user, userRole, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      student: "Student",
      admin: "Administrator",
    };
    return roleNames[role] || "User";
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      student: "bg-blue-100 text-blue-800",
      admin: "bg-red-100 text-red-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <img
          src={user?.photoURL || "/default-avatar.png"}
          alt={user?.displayName || "User"}
          className="h-8 w-8 rounded-full"
          onError={(e) => {
            e.target.src = "/default-avatar.png";
          }}
        />
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">
            {user?.displayName || "User"}
          </p>
          <p className="text-xs text-gray-500">
            {getRoleDisplayName(userRole)}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <img
                  src={user?.photoURL || "/default-avatar.png"}
                  alt={user?.displayName || "User"}
                  className="h-12 w-12 rounded-full"
                  onError={(e) => {
                    e.target.src = "/default-avatar.png";
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.displayName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">{user?.email}</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      userRole
                    )}`}
                  >
                    {getRoleDisplayName(userRole)}
                  </span>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <User className="h-4 w-4 mr-3" />
                View Profile
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-4 w-4 mr-3" />
                Settings
              </button>
            </div>

            <div className="border-t border-gray-200 py-2">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
