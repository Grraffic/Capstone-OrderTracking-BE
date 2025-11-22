import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

/**
 * Sidebar Component
 *
 * Collapsible sidebar with navigation items
 * Props:
 *   - isOpen: boolean - whether sidebar is expanded or collapsed
 */
const Sidebar = ({ isOpen = true }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const navItems = [
    { to: "/admin", label: "Home", icon: Home },
    { to: "/admin/inventory", label: "Inventory", icon: Package },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still navigate to login even if logout fails
      navigate("/login");
    }
  };

  const navItem = (to, label, Icon, isExact = false) => (
    <NavLink
      to={to}
      end={isExact}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-[#0C2340] text-white"
            : "text-[#0C2340] hover:bg-[#f3f6fb]"
        }`
      }
      title={!isOpen ? label : ""}
    >
      <Icon size={20} className="flex-shrink-0" />
      {isOpen && <span>{label}</span>}

      {/* Tooltip for collapsed state */}
      {!isOpen && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-[#0C2340] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          {label}
        </div>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 p-4 flex flex-col transition-all duration-300 z-30 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo Section */}
      <div
        className={`h-16 flex items-center mb-8 px-3 transition-all duration-300 ${
          isOpen ? "" : "justify-center"
        }`}
      >
        <div className="flex items-center gap-3">
          <img
            src="/assets/image/LV Logo.png"
            alt="La Verdad Logo"
            className="w-12 h-12 rounded-lg flex-shrink-0 object-cover"
          />
          {isOpen && (
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-[#003363]">
                La Verdad
              </h2>
              <p className="text-lg text-gray-500">OrderHub</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <div key={item.to}>
            {navItem(item.to, item.label, item.icon, item.to === "/admin")}
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div
        className={`px-3 pt-6 border-t border-gray-200 ${
          !isOpen ? "flex justify-center" : ""
        }`}
      >
        <button
          onClick={handleLogout}
          className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 ${
            !isOpen ? "justify-center" : "w-full"
          }`}
          title={!isOpen ? "Logout" : ""}
          aria-label="Logout"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isOpen && <span>Logout</span>}

          {/* Tooltip for collapsed state */}
          {!isOpen && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-[#0C2340] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
