import { useState, useCallback, useEffect } from "react";
import { isCategoryValidForEducationLevel } from "../../constants/inventoryOptions";

/**
 * useInventoryModalForm Hook
 *
 * Manages form state and logic for the Inventory Modal (Add/Edit Item)
 * Handles form data, validation, adjustment type selection, image upload, and submission
 *
 * @param {Object} selectedItem - The item being edited (null for add mode)
 * @param {Function} onSubmit - Callback function when form is submitted
 * @param {Function} onClose - Callback function to close the modal
 * @param {Object} modalState - Modal state object with isOpen and mode properties
 * @returns {Object} Form state and handlers
 *
 * Usage:
 * const {
 *   formData,
 *   errors,
 *   adjustmentType,
 *   imagePreview,
 *   isDragging,
 *   handleInputChange,
 *   handleAdjustmentTypeChange,
 *   handleImageUpload,
 *   handleDragOver,
 *   handleDragLeave,
 *   handleDrop,
 *   handleBrowseClick,
 *   handleSubmit,
 *   validateForm,
 * } = useInventoryModalForm(selectedItem, onSubmit, onClose, modalState);
 */
export const useInventoryModalForm = (
  selectedItem,
  onSubmit,
  onClose,
  modalState
) => {
  // Adjustment type state: "Item Details" or "Inventory Threshold"
  const [adjustmentType, setAdjustmentType] = useState("Item Details");

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    educationLevel: "",
    category: "",
    description: "", // Size field
    descriptionText: "", // Description field
    material: "", // Material/Type field
    itemType: "",
    stock: 0,
    price: 0,
    image: "/assets/image/card1.png",
    // Inventory Threshold fields
    physicalCount: 0,
    available: 0,
    reorderPoint: 0,
    note: "",
  });

  // Form validation errors
  const [errors, setErrors] = useState({});

  // Image upload state
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize form data when modal opens or selectedItem changes
  useEffect(() => {
    // Only reset when modal is open
    if (modalState?.isOpen) {
      if (selectedItem) {
        setFormData({
          name: selectedItem.name || "",
          educationLevel: selectedItem.educationLevel || "",
          category: selectedItem.category || "",
          description: selectedItem.description || "",
          descriptionText: selectedItem.descriptionText || "",
          material: selectedItem.material || "",
          itemType: selectedItem.itemType || "",
          stock: selectedItem.stock || 0,
          price: selectedItem.price || 0,
          image: selectedItem.image || "/assets/image/card1.png",
          // Inventory Threshold fields
          physicalCount: selectedItem.physicalCount || 0,
          available: selectedItem.available || 0,
          reorderPoint: selectedItem.reorderPoint || 0,
          note: selectedItem.note || "",
        });
        setImagePreview(selectedItem.image || null);
        setAdjustmentType("Item Details"); // Reset to Item Details for edit mode
      } else {
        // Reset form for add mode
        setFormData({
          name: "",
          educationLevel: "",
          category: "",
          description: "",
          descriptionText: "",
          material: "",
          itemType: "",
          stock: 0,
          price: 0,
          image: "/assets/image/card1.png",
          // Inventory Threshold fields
          physicalCount: 0,
          available: 0,
          reorderPoint: 0,
          note: "",
        });
        setImagePreview(null);
        setAdjustmentType("Item Details"); // Reset to Item Details for add mode
      }
      setErrors({});
    }
  }, [selectedItem, modalState?.isOpen]);

  /**
   * Handle input field changes with cascading dropdown logic
   * @param {Event} e - Input change event
   */
  const handleInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      // Handle Education Level change - reset category if it's not valid for new education level
      if (name === "educationLevel") {
        setFormData((prev) => {
          const newData = {
            ...prev,
            educationLevel: value,
          };

          // Check if current category is valid for the new education level
          if (
            prev.category &&
            !isCategoryValidForEducationLevel(prev.category, value)
          ) {
            newData.category = ""; // Reset category if not valid
          }

          return newData;
        });
      } else {
        // Handle other field changes
        setFormData((prev) => ({
          ...prev,
          [name]:
            name === "stock" ||
            name === "price" ||
            name === "physicalCount" ||
            name === "available" ||
            name === "reorderPoint"
              ? Number(value)
              : value,
        }));
      }

      // Clear error for this field when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    },
    [errors]
  );

  /**
   * Handle adjustment type change (radio button)
   * @param {string} type - The adjustment type ("Item Details" or "Inventory Threshold")
   */
  const handleAdjustmentTypeChange = useCallback((type) => {
    setAdjustmentType(type);
  }, []);

  /**
   * Handle image file upload
   * @param {File} file - Image file to upload
   */
  const handleImageUpload = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Please upload a valid image file",
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: "Image size should be less than 5MB",
      }));
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setFormData((prev) => ({
        ...prev,
        image: reader.result,
      }));
      setErrors((prev) => ({
        ...prev,
        image: "",
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Handle drag over event
   * @param {Event} e - Drag event
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Handle drag leave event
   * @param {Event} e - Drag event
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * Handle drop event
   * @param {Event} e - Drop event
   */
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  /**
   * Handle browse button click
   * Opens file input dialog
   */
  const handleBrowseClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  }, [handleImageUpload]);

  /**
   * Validate form data
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required fields validation
    // Note: name field is auto-generated from category, so we don't validate it
    if (!formData.educationLevel) {
      newErrors.educationLevel = "Education level is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.itemType) {
      newErrors.itemType = "Item type is required";
    }

    // Conditional validation based on adjustment type
    if (adjustmentType === "Item Details") {
      if (formData.stock < 0) {
        newErrors.stock = "Stock cannot be negative";
      }
      if (formData.price < 0) {
        newErrors.price = "Price cannot be negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, adjustmentType]);

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (validateForm()) {
        // Auto-generate name from category if not provided
        const submissionData = {
          ...formData,
          name: formData.name || formData.category, // Use category as name if name is empty
          adjustmentType,
        };
        onSubmit(submissionData);
      }
    },
    [formData, adjustmentType, validateForm, onSubmit]
  );

  return {
    formData,
    errors,
    adjustmentType,
    imagePreview,
    isDragging,
    handleInputChange,
    handleAdjustmentTypeChange,
    handleImageUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    handleSubmit,
    validateForm,
  };
};
