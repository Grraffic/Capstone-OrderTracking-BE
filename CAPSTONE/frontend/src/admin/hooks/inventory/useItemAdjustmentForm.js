import { useState, useCallback, useEffect } from "react";

/**
 * useItemAdjustmentForm Hook
 *
 * Manages form state and logic for the Item Adjustment Modal
 * Handles form data, validation, image upload, and submission
 *
 * @param {Object} selectedItem - The item being edited (null for add mode)
 * @param {Function} onSubmit - Callback function when form is submitted
 * @param {Function} onClose - Callback function to close the modal
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
 * } = useItemAdjustmentForm(selectedItem, onSubmit, onClose);
 */
export const useItemAdjustmentForm = (selectedItem, onSubmit, onClose) => {
  // Adjustment type state: "Item Details" or "Inventory Threshold"
  const [adjustmentType, setAdjustmentType] = useState("Item Details");

  // Form data state
  const [formData, setFormData] = useState({
    educationLevel: "",
    itemCategory: "",
    size: "",
    description: "",
    itemType: "",
    unitPrice: "",
    image: "",
  });

  // Form validation errors
  const [errors, setErrors] = useState({});

  // Image upload state
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize form data when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      setFormData({
        educationLevel: selectedItem.educationLevel || "",
        itemCategory: selectedItem.category || "",
        size: selectedItem.description || "",
        description: selectedItem.description || "",
        itemType: selectedItem.itemType || "",
        unitPrice: selectedItem.price || "",
        image: selectedItem.image || "",
      });
      setImagePreview(selectedItem.image || null);
    } else {
      // Reset form for add mode
      setFormData({
        educationLevel: "",
        itemCategory: "",
        size: "",
        description: "",
        itemType: "",
        unitPrice: "",
        image: "",
      });
      setImagePreview(null);
    }
    setErrors({});
  }, [selectedItem]);

  /**
   * Handle input field changes
   * @param {Event} e - Input change event
   */
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  }, [errors]);

  /**
   * Handle adjustment type toggle
   * @param {string} type - "Item Details" or "Inventory Threshold"
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
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

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
   * @returns {boolean} - True if form is valid
   */
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.educationLevel.trim()) {
      newErrors.educationLevel = "Education level is required";
    }

    if (!formData.itemCategory.trim()) {
      newErrors.itemCategory = "Item category is required";
    }

    if (!formData.size.trim()) {
      newErrors.size = "Size is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.itemType.trim()) {
      newErrors.itemType = "Item type is required";
    }

    if (!formData.unitPrice) {
      newErrors.unitPrice = "Unit price is required";
    } else if (isNaN(formData.unitPrice) || Number(formData.unitPrice) < 0) {
      newErrors.unitPrice = "Please enter a valid price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submissionData = {
      ...formData,
      unitPrice: Number(formData.unitPrice),
      adjustmentType,
    };

    onSubmit(submissionData);
  }, [formData, adjustmentType, validateForm, onSubmit]);

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

