import { Plus, Search, QrCode } from "lucide-react";
import Sidebar from "../components/common/Sidebar";
import AdminHeader from "../components/common/AdminHeader";
import InventoryTable from "../components/Inventory/InventoryTable";
import InventoryModals from "../components/Inventory/InventoryModals";
import ItemAdjustmentModal from "../components/Inventory/ItemAdjustmentModal";
import QRCodeScannerModal from "../components/Inventory/QRCodeScannerModal";
import InventoryStatsCards from "../components/Inventory/InventoryStatsCards";
import {
  useAdminSidebar,
  useQRScanner,
  useInventoryStats,
  useInventory,
} from "../hooks";

/**
 * Inventory Page Component
 *
 * Main inventory management page for admin section with:
 * - Sidebar navigation
 * - Header with menu toggle
 * - Search functionality
 * - Statistics cards (Total Items, In Stock, Low Stock, Out of Stock)
 * - Add new item button
 * - Education level and item type filters
 * - Inventory table with CRUD operations
 * - Modal dialogs for add/edit/view/delete
 * - QR code scanner for quick item lookup
 *
 * Features:
 * - Real-time search filtering
 * - Add new inventory items
 * - Edit existing items
 * - View item details
 * - Delete items with confirmation
 * - Responsive layout with proper visual hierarchy
 */
const Inventory = () => {
  // Custom hooks for UI state management
  const { sidebarOpen, toggleSidebar } = useAdminSidebar();

  // Inventory data and operations
  const {
    paginatedItems,
    filteredItems,
    searchTerm,
    setSearchTerm,
    selectedItem,
    modalState,
    openAddModal,
    openEditModal,
    openViewModal,
    openDeleteModal,
    closeModal,
    addItem,
    updateItem,
    deleteItem,
    // Pagination
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    // Filters
    educationLevelFilter,
    setEducationLevelFilter,
    itemTypeFilter,
    setItemTypeFilter,
    // Item Adjustment Modal
    adjustmentModalState,
    openAdjustmentModal,
    closeAdjustmentModal,
  } = useInventory();

  // QR Scanner functionality
  const { qrScannerOpen, openQRScanner, closeQRScanner, handleQRCodeScanned } =
    useQRScanner(setSearchTerm);

  // Calculate inventory statistics
  const stats = useInventoryStats(filteredItems);

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
        {/* Inventory Content */}
        <div className="p-8">
          {/* Page Header - Title and Top-Right Controls */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Page Title - Left Side */}
            <div>
              <h1 className="text-4xl font-bold">
                <span className="text-[#0C2340]">Inven</span>
                <span className="text-[#e68b00]">tory</span>
              </h1>
            </div>

            {/* Top-Right Controls - Scan QR Code Button and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Scan QR Code Button */}
              <button
                onClick={openQRScanner}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap font-medium text-sm"
                title="Scan QR Code"
                aria-label="Scan QR Code"
              >
                <QrCode size={20} />
                <span>Scan QR Code</span>
              </button>

              {/* Search Bar */}
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Statistics Cards Section - Above Action Controls */}
          <div className="mb-8">
            <InventoryStatsCards stats={stats} />
          </div>

          {/* Action Controls Row - Right-Aligned Below Statistics Cards */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end">
            {/* Add New Item Button - Rightmost */}
            <button
              onClick={openAddModal}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 bg-[#e68b00] text-white rounded-lg hover:bg-[#d67a00] transition-colors shadow-sm whitespace-nowrap font-medium text-sm"
              title="Add New Item"
              aria-label="Add New Item"
            >
              {/* <Plus size={20} /> */}
              <span>Add Item</span>
            </button>

            {/* Education Level Filter - Left (within right-aligned group) */}
            <select
              value={educationLevelFilter}
              onChange={(e) => setEducationLevelFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              title="Filter by education level"
              aria-label="Education Level"
            >
              <option value="All Levels">Education Level</option>
              <option value="All Levels">All Levels</option>
              <option value="Kindergarten">Kindergarten</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
            </select>

            {/* Item Type Filter - Middle */}
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0C2340] focus:border-transparent text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              title="Filter by item type"
              aria-label="Item Type"
            >
              <option value="All Types">Item Type</option>
              <option value="All Types">All Types</option>
              <option value="Uniform">Uniform</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>

          {/* Inventory Table */}
          <InventoryTable
            items={paginatedItems}
            onView={openViewModal}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            onAdjustment={openAdjustmentModal}
            currentPage={currentPage}
            totalPages={totalPages}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onGoToPage={goToPage}
          />

          {/* Results Info */}
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredItems.length} result
              {filteredItems.length !== 1 ? "s" : ""} for "{searchTerm}"
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <InventoryModals
        modalState={modalState}
        selectedItem={selectedItem}
        onClose={closeModal}
        onAdd={addItem}
        onUpdate={updateItem}
        onDelete={deleteItem}
      />

      {/* Item Adjustment Modal */}
      <ItemAdjustmentModal
        isOpen={adjustmentModalState.isOpen}
        selectedItem={selectedItem}
        onClose={closeAdjustmentModal}
        onSubmit={(data) => {
          console.log("Item adjustment submitted:", data);
          closeAdjustmentModal();
        }}
      />

      {/* QR Code Scanner Modal */}
      <QRCodeScannerModal
        isOpen={qrScannerOpen}
        onClose={closeQRScanner}
        onScan={handleQRCodeScanned}
      />
    </div>
  );
};

export default Inventory;
