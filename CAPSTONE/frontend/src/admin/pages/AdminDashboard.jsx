import Sidebar from "../components/common/Sidebar";
import AdminHeader from "../components/common/AdminHeader";
import OverviewCards from "../components/Dashboard/OverviewCards";
import StockLevelsChart from "../components/Inventory/StockLevelsChart";
import RecentOrdersTable from "../components/Dashboard/RecentOrdersTable";
import { useAdminDashboardData } from "../hooks";

const AdminDashboard = () => {
  const {
    sidebarOpen,
    toggleSidebar,
    activeTab,
    handleTabChange,
    overviewStats,
    stockLevelsData,
    recentOrders,
  } = useAdminDashboardData();

  const tabs = ["Week", "Month", "Year"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Fixed Header */}
      <AdminHeader onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />

      {/* Main Content Area - Scrollable */}
      <main
        className={`fixed top-16 bottom-0 right-0 bg-gray-50 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? "left-64" : "left-20"
        }`}
      >
        {/* Dashboard Content */}
        <div className="p-8">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold">
              <span className="text-[#0C2340]">Dash</span>
              <span className="text-[#e68b00]">board</span>
            </h1>
          </div>

          {/* Overview and Stock Levels - Side by Side Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left Side: Overview Section */}
            <div>
              <div className="flex items-center gap-8 mb-4">
                <h2 className="text-lg font-semibold text-[#0C2340]">
                  Overview
                </h2>
                {/* Tabs */}
                <div className="flex gap-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`pb-0 font-medium transition-colors relative text-sm ${
                        activeTab === tab
                          ? "text-[#e68b00]"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e68b00] rounded-t-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <OverviewCards stats={overviewStats} />
            </div>

            {/* Right Side: Stock Levels Chart */}
            <div>
              <h2 className="text-lg font-semibold text-[#0C2340] mb-4">
                Stock Levels
              </h2>
              <StockLevelsChart data={stockLevelsData} />
            </div>
          </div>

          {/* Recent Orders Table */}
          <div>
            <h2 className="text-lg font-semibold text-[#0C2340] mb-4">
              Recent Orders
            </h2>
            <RecentOrdersTable orders={recentOrders} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
