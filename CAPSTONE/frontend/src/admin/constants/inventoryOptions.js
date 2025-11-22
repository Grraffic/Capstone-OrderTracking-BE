/**
 * Inventory Modal Dropdown Options and Cascading Logic
 *
 * This file contains all dropdown options for the Inventory Modal form
 * and the logic for cascading dropdowns (Education Level → Category)
 */

// Education Level Options
export const EDUCATION_LEVELS = [
  { value: "All Education Levels", label: "All Education Levels" },
  { value: "Kindergarten", label: "Kindergarten" },
  { value: "Elementary", label: "Elementary" },
  { value: "Junior High School", label: "Junior High School" },
  { value: "Senior High School", label: "Senior High School" },
  { value: "College", label: "College" },
  // { value: "General/PE", label: "General/PE" },
];

// Item Type Options
export const ITEM_TYPES = [
  // { value: "All Item Types", label: "All Item Types" },
  { value: "Uniforms", label: "Uniforms" },
  { value: "Accessories", label: "Accessories" },
];

// All Category Options
export const ALL_CATEGORIES = [
  { value: "Kinder Dress", label: "Kinder Dress" },
  { value: "Kinder Shorts", label: "Kinder Shorts" },
  { value: "Necktie", label: "Necktie" },
  { value: "Elem Blouse", label: "Elem Blouse" },
  { value: "Elem Skirt", label: "Elem Skirt" },
  { value: "JHS Blouse", label: "JHS Blouse" },
  { value: "JHS/Coll. Skirt", label: "JHS/Coll. Skirt" },
  { value: "SHS L-Sleeves", label: "SHS L-Sleeves" },
  { value: "SHS Pants", label: "SHS Pants" },
  { value: "SHS Blouse", label: "SHS Blouse" },
  { value: "SHS Skirt", label: "SHS Skirt" },
  { value: "SHS Necktie", label: "SHS Necktie" },
  { value: "College Blouse", label: "College Blouse" },
  { value: "Jersey", label: "Jersey" },
  { value: "JPants", label: "JPants" },
  { value: "Polo Jacket", label: "Polo Jacket" },
  { value: "Polo Straight", label: "Polo Straight" },
  { value: "Pants", label: "Pants" },
  { value: "Logo Patch", label: "Logo Patch" },
  { value: "New Logo Patch", label: "New Logo Patch" },
  { value: "No. Patch", label: "No. Patch" },
  { value: "ID Lace", label: "ID Lace" },
];

// Material Type Options (always visible, not cascading)
export const MATERIAL_TYPES = [
  { value: "cotton", label: "cotton" },
  { value: "clothman", label: "clothman" },
  { value: "katrina", label: "katrina" },
  { value: "garter slim", label: "garter slim" },
  { value: "garter navy blue", label: "garter navy blue" },
  { value: "regular size", label: "regular size" },
];

// Categories that appear for ALL education levels (shared items)
const SHARED_CATEGORIES = [
  "Necktie",
  "Logo Patch",
  "New Logo Patch",
  "No. Patch",
  "ID Lace",
];

// Education Level to Category Mapping
export const EDUCATION_LEVEL_CATEGORIES = {
  "All Education Levels": ALL_CATEGORIES.map((cat) => cat.value),
  Kindergarten: ["Kinder Dress", "Kinder Shorts", ...SHARED_CATEGORIES],
  Elementary: ["Elem Blouse", "Elem Skirt", ...SHARED_CATEGORIES],
  "Junior High School": ["JHS Blouse", "JHS/Coll. Skirt", ...SHARED_CATEGORIES],
  "Senior High School": [
    "SHS L-Sleeves",
    "SHS Pants",
    "SHS Blouse",
    "SHS Skirt",
    "SHS Necktie",
    ...SHARED_CATEGORIES,
  ],
  College: ["College Blouse", "JHS/Coll. Skirt", ...SHARED_CATEGORIES],
  "General/PE": [
    "Jersey",
    "JPants",
    "Polo Jacket",
    "Polo Straight",
    "Pants",
    ...SHARED_CATEGORIES,
  ],
};

/**
 * Get filtered categories based on selected education level
 * @param {string} educationLevel - Selected education level
 * @returns {Array} Filtered category options
 */
export const getFilteredCategories = (educationLevel) => {
  if (!educationLevel || educationLevel === "") {
    return ALL_CATEGORIES;
  }

  const allowedCategories = EDUCATION_LEVEL_CATEGORIES[educationLevel] || [];

  return ALL_CATEGORIES.filter((category) =>
    allowedCategories.includes(category.value)
  );
};

/**
 * Check if a category is valid for the selected education level
 * @param {string} category - Category to check
 * @param {string} educationLevel - Selected education level
 * @returns {boolean} True if category is valid for the education level
 */
export const isCategoryValidForEducationLevel = (category, educationLevel) => {
  if (
    !educationLevel ||
    educationLevel === "" ||
    educationLevel === "All Education Levels"
  ) {
    return true;
  }

  const allowedCategories = EDUCATION_LEVEL_CATEGORIES[educationLevel] || [];
  return allowedCategories.includes(category);
};
