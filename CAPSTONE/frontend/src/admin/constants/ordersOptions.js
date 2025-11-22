/**
 * Orders Page Constants
 * 
 * Contains all dropdown options and cascading logic for the Orders page:
 * - Education Level options (Basic Education, Higher Education)
 * - Class and Year options (cascading based on Education Level)
 * - Order status options
 */

// Education Level Options
export const EDUCATION_LEVELS = [
  "All Education Levels",
  "Basic Education",
  "Higher Education",
];

// Class and Year Options for Higher Education
export const HIGHER_EDUCATION_PROGRAMS = [
  "BSIS - 1st Year",
  "BSIS - 2nd Year",
  "BSIS - 3rd Year",
  "BSIS - 4th Year",
  "BAB - 1st Year",
  "BAB - 2nd Year",
  "BAB - 3rd Year",
  "BAB - 4th Year",
  "BSA - 1st Year",
  "BSA - 2nd Year",
  "BSA - 3rd Year",
  "BSA - 4th Year",
  "BSAIS - 1st Year",
  "BSAIS - 2nd Year",
  "BSAIS - 3rd Year",
  "BSAIS - 4th Year",
  "BSSW - 1st Year",
  "BSSW - 2nd Year",
  "BSSW - 3rd Year",
  "BSSW - 4th Year",
];

// Class and Year Options for Basic Education
export const BASIC_EDUCATION_LEVELS = [
  "Pre-Kindergarten",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

// All Class and Year Options Combined
export const ALL_CLASS_AND_YEAR = [
  ...BASIC_EDUCATION_LEVELS,
  ...HIGHER_EDUCATION_PROGRAMS,
];

// Order Status Options
export const ORDER_STATUS = [
  "All Status",
  "Pending",
  "Processing",
  "Completed",
  "Claimed",
  "Cancelled",
];

/**
 * Get filtered Class and Year options based on selected Education Level
 * @param {string} educationLevel - Selected education level
 * @returns {Array<string>} Filtered class and year options
 */
export const getFilteredClassAndYear = (educationLevel) => {
  if (!educationLevel || educationLevel === "All Education Levels") {
    return ALL_CLASS_AND_YEAR;
  }

  if (educationLevel === "Higher Education") {
    return HIGHER_EDUCATION_PROGRAMS;
  }

  if (educationLevel === "Basic Education") {
    return BASIC_EDUCATION_LEVELS;
  }

  return ALL_CLASS_AND_YEAR;
};

/**
 * Check if a class/year is valid for the selected education level
 * @param {string} classAndYear - Class and year to validate
 * @param {string} educationLevel - Selected education level
 * @returns {boolean} True if valid, false otherwise
 */
export const isClassAndYearValidForEducationLevel = (
  classAndYear,
  educationLevel
) => {
  if (!educationLevel || educationLevel === "All Education Levels") {
    return true;
  }

  const validOptions = getFilteredClassAndYear(educationLevel);
  return validOptions.includes(classAndYear);
};

