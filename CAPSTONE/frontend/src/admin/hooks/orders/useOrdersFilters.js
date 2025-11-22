import { useState, useCallback, useMemo } from "react";
import {
  getFilteredClassAndYear,
  isClassAndYearValidForEducationLevel,
} from "../../constants/ordersOptions";

/**
 * Custom hook for managing Orders page filters
 *
 * Handles:
 * - Education Level filter (with cascading logic)
 * - Class and Year filter (cascades based on Education Level)
 * - Status filter
 * - Search term
 * - Auto-reset of Class and Year when Education Level changes
 *
 * @returns {Object} Filter state and handlers
 */
const useOrdersFilters = () => {
  // Filter states
  const [educationLevelFilter, setEducationLevelFilter] = useState(
    "All Education Levels"
  );
  const [classAndYearFilter, setClassAndYearFilter] =
    useState("All Class & Year");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Handle Education Level filter change
   * Auto-resets Class and Year if current selection is not valid for new education level
   */
  const handleEducationLevelChange = useCallback(
    (newEducationLevel) => {
      setEducationLevelFilter(newEducationLevel);

      // Check if current class/year is valid for new education level
      if (
        classAndYearFilter !== "All Class & Year" &&
        !isClassAndYearValidForEducationLevel(
          classAndYearFilter,
          newEducationLevel
        )
      ) {
        // Reset class/year if not valid
        setClassAndYearFilter("All Class & Year");
      }
    },
    [classAndYearFilter]
  );

  /**
   * Get filtered class and year options based on current education level
   */
  const filteredClassAndYearOptions = useMemo(() => {
    return getFilteredClassAndYear(educationLevelFilter);
  }, [educationLevelFilter]);

  /**
   * Reset all filters to default values
   */
  const resetFilters = useCallback(() => {
    setEducationLevelFilter("All Education Levels");
    setClassAndYearFilter("All Class & Year");
    setStatusFilter("All Status");
    setSearchTerm("");
  }, []);

  return {
    // Filter states
    educationLevelFilter,
    classAndYearFilter,
    statusFilter,
    searchTerm,

    // Filter setters
    setEducationLevelFilter: handleEducationLevelChange,
    setClassAndYearFilter,
    setStatusFilter,
    setSearchTerm,

    // Computed values
    filteredClassAndYearOptions,

    // Utility functions
    resetFilters,
  };
};

export default useOrdersFilters;
