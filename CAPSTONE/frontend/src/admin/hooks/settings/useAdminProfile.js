import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { profileService } from "../../../services/profile.service";
import { toast } from "react-hot-toast";

/**
 * Custom hook for managing admin profile settings
 *
 * Features:
 * - Fetch current profile data
 * - Handle form state management
 * - Handle profile image upload
 * - Save profile changes
 * - Discard changes
 * - Form validation
 * - Loading and error states
 */
export const useAdminProfile = () => {
  const { user, updateUser } = useAuth();

  // Profile data from backend
  const [profile, setProfile] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    name: "",
  });

  // Original form data (for discard functionality)
  const [originalFormData, setOriginalFormData] = useState({
    firstName: "",
    lastName: "",
    name: "",
  });

  // Image preview state
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Fetch profile data on mount
   */
  useEffect(() => {
    fetchProfile();
  }, []);

  /**
   * Fetch profile data from backend
   */
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);

      // Parse name into first and last name
      const nameParts = (data.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const initialFormData = {
        firstName,
        lastName,
        name: data.name || "",
      };

      setFormData(initialFormData);
      setOriginalFormData(initialFormData);
      setOriginalImageUrl(data.photoURL);
      setImagePreview(data.photoURL);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if form has changes
   */
  useEffect(() => {
    const formChanged =
      formData.firstName !== originalFormData.firstName ||
      formData.lastName !== originalFormData.lastName ||
      imageFile !== null;

    setHasChanges(formChanged);
  }, [formData, originalFormData, imageFile]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Update full name when first or last name changes
      name:
        name === "firstName" || name === "lastName"
          ? `${name === "firstName" ? value : prev.firstName} ${
              name === "lastName" ? value : prev.lastName
            }`.trim()
          : prev.name,
    }));

    // Clear error for this field
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }, []);

  /**
   * Handle image file selection
   */
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: "Please upload a valid image file (JPG, PNG, or GIF)",
      }));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        image: "Image size must be less than 5MB",
      }));
      return;
    }

    // Clear image error
    setErrors((prev) => ({
      ...prev,
      image: "",
    }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Store file for upload
    setImageFile(file);
  }, []);

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate first name
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save changes
   */
  const handleSaveChanges = async () => {
    // Validate form
    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    try {
      setIsSaving(true);

      // Prepare update data
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const updateData = {
        name: fullName,
      };

      // Upload image if changed
      let imageUrl = originalImageUrl;
      if (imageFile) {
        try {
          imageUrl = await profileService.uploadProfileImage(imageFile);
          updateData.photoURL = imageUrl;
        } catch (error) {
          console.error("Image upload failed:", error);
          toast.error("Failed to upload profile image");
          return;
        }
      }

      // Update profile
      const updatedProfile = await profileService.updateProfile(updateData);

      // Update local state
      setProfile(updatedProfile);
      setOriginalFormData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: fullName,
      });
      setOriginalImageUrl(imageUrl);
      setImageFile(null);

      // Update auth context
      if (updateUser) {
        updateUser({
          ...user,
          displayName: fullName,
          photoURL: imageUrl,
        });
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle discard changes
   */
  const handleDiscardChanges = useCallback(() => {
    // Reset form to original values
    setFormData(originalFormData);
    setImagePreview(originalImageUrl);
    setImageFile(null);
    setErrors({});
    toast.success("Changes discarded");
  }, [originalFormData, originalImageUrl]);

  return {
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
  };
};
