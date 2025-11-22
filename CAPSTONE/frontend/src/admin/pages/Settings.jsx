import React, { useState } from "react";
import { Camera, Save, X } from "lucide-react";
import Sidebar from "../components/common/Sidebar";
import AdminHeader from "../components/common/AdminHeader";
import { useAdminSidebar } from "../hooks";
import { useAdminProfile } from "../hooks/settings/useAdminProfile";
import DiscardChangesModal from "../components/Settings/DiscardChangesModal";

/**
 * Admin Settings Page Component
 *
 * Features:
 * - Profile image upload (clickable with hover effect)
 * - Editable profile information (name)
 * - Fixed email display (from Google OAuth)
 * - Discard Changes button with confirmation modal
 * - Save Changes button with validation
 * - Responsive design
 * - No password change section (OAuth authentication)
 */
const Settings = () => {
  const { sidebarOpen, toggleSidebar } = useAdminSidebar();
  const {
    profile,
    formData,
    imagePreview,
    isLoading,
    isSaving,
    errors,
    hasChanges,
    handleInputChange,
    handleImageSelect,
    handleSaveChanges,
    handleDiscardChanges,
  } = useAdminProfile();

  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const handleDiscardClick = () => {
    if (hasChanges) {
      setShowDiscardModal(true);
    }
  };

  const handleConfirmDiscard = () => {
    handleDiscardChanges();
    setShowDiscardModal(false);
  };

  const handleCancelDiscard = () => {
    setShowDiscardModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} />
        <AdminHeader onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main
          className={`fixed top-16 bottom-0 right-0 bg-gray-50 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? "left-64" : "left-20"
          }`}
        >
          <div className="p-8 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e68b00] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
        <div className="p-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold">
              <span className="text-[#0C2340]">Set</span>
              <span className="text-[#e68b00]">tings</span>
            </h1>
          </div>

          {/* Settings Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side - Profile Image */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                {/* Profile Image */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-[#e68b00] shadow-lg">
                      <img
                        src={
                          imagePreview ||
                          profile?.photoURL ||
                          "/default-avatar.png"
                        }
                        alt={formData.name || "Admin"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.target.src = "/default-avatar.png";
                        }}
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Camera Icon Badge */}
                    <button
                      onClick={() =>
                        document.getElementById("profile-image-input").click()
                      }
                      className="absolute bottom-2 right-2 w-10 h-10 bg-[#e68b00] rounded-full flex items-center justify-center shadow-lg hover:bg-[#d97a1f] transition-colors cursor-pointer"
                      title="Change profile picture"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>

                    {/* Hidden File Input */}
                    <input
                      id="profile-image-input"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Admin Name */}
                  <h2 className="mt-4 text-xl font-bold text-[#0C2340]">
                    {formData.name || "Admin"}
                  </h2>

                  {/* Image Upload Error */}
                  {errors.image && (
                    <p className="mt-2 text-sm text-red-600 text-center">
                      {errors.image}
                    </p>
                  )}
                </div>

                {/* Navigation Tabs (Optional - for future expansion) */}
                <div className="mt-8 space-y-2">
                  <button className="w-full px-4 py-3 bg-[#FFF4E6] text-[#e68b00] rounded-lg font-semibold flex items-center gap-3 transition-colors">
                    <span className="text-lg">👤</span>
                    <span>Personal Information</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Profile Information Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                {/* Section Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#e68b00]">
                    Personal Information
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Update your profile information
                  </p>
                </div>

                {/* Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveChanges();
                  }}
                  className="space-y-6"
                >
                  {/* Name Fields - Two Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-semibold text-[#0C2340] mb-2"
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e68b00] transition-colors ${
                          errors.firstName
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter first name"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-semibold text-[#0C2340] mb-2"
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e68b00] transition-colors ${
                          errors.lastName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter last name"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email Address - Read Only */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-[#0C2340] mb-2"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="Email from Google Account"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    {/* Discard Changes Button */}
                    <button
                      type="button"
                      onClick={handleDiscardClick}
                      disabled={!hasChanges || isSaving}
                      className="flex-1 px-6 py-3 border-2 border-[#0C2340] text-[#0C2340] font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      <span>Discard Changes</span>
                    </button>

                    {/* Save Changes Button */}
                    <button
                      type="submit"
                      disabled={!hasChanges || isSaving}
                      className="flex-1 px-6 py-3 bg-[#e68b00] text-white font-semibold rounded-lg hover:bg-[#d97a1f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Discard Changes Confirmation Modal */}
      <DiscardChangesModal
        isOpen={showDiscardModal}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </div>
  );
};

export default Settings;
