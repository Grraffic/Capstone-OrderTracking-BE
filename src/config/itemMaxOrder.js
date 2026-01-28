/**
 * Max order per item: rules by education_level × student_type × gender.
 * Per-segment limits follow the Max Per Item spec: Preschool/Elementary/Junior High/Senior High/College × New/Old × Girls/Boys.
 * Keys: normalized item names (lowercase, single spaces). Values: max quantity per student.
 * Education levels: Kindergarten (Preschool), Elementary, Junior High School, Senior High School, College.
 * Vocational is treated as College.
 */

const DEFAULT_MAX = 1;

/** Segment key: educationLevel_studentType_gender */
function segmentKey(educationLevel, studentType, gender) {
  const level = (educationLevel || "").trim();
  const type = (studentType || "new").toLowerCase();
  const g = (gender || "").trim();
  return `${level}_${type}_${g}`;
}

/** Normalize item name for lookup: lowercase, collapse spaces, trim */
function normalizeItemName(name) {
  if (!name || typeof name !== "string") return "";
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Aliases from common DB/product names to config keys (normalizeItemName applied first) */
const ITEM_ALIASES = {
  "id lace": "id lace",
  "logo patch": "logo patch",
  "logo patch (kindergarten)": "logo patch",
  "logo patch - kindergarten": "logo patch",
  "logo patch (preschool)": "logo patch",
  "logo patch - preschool": "logo patch",
  "logo patch (elementary)": "logo patch",
  "logo patch - elementary": "logo patch",
  "logo patch (junior high school)": "logo patch",
  "logo patch - junior high school": "logo patch",
  "logo patch (senior high school)": "logo patch",
  "logo patch - senior high school": "logo patch",
  "logo patch (college)": "logo patch",
  "logo patch - college": "logo patch",
  "logo patch (prekindergarten)": "logo patch",
  "logo patch - prekindergarten": "logo patch",
  "new logo patch": "new logo patch",
  "number patch": "number patch",
  "ordinary necktie (garter)": "ordinary necktie (garter)",
  "ordinary necktie": "ordinary necktie",
  "necktie girls": "necktie girls",
  "necktie boys": "necktie boys",
  "kinder dress": "kinder dress",
  "kinder necktie": "kinder necktie",
  "elem skirt": "elem skirt",
  "elem blouse": "elem blouse",
  "elementary skirt": "elem skirt",
  "elementary blouse": "elem blouse",
  "jhs skirt": "jhs skirt",
  "jhs blouse": "jhs blouse",
  "junior high skirt": "jhs skirt",
  "junior high blouse": "jhs blouse",
  "shs skirt": "shs skirt",
  "shs blouse": "shs blouse",
  "shs pants": "shs pants",
  "shs long-sleeve": "shs long-sleeve",
  "senior high skirt": "shs skirt",
  "senior high blouse": "shs blouse",
  "senior high pants": "shs pants",
  "senior high long-sleeve": "shs long-sleeve",
  "college skirt": "college skirt",
  "college blouse": "college blouse",
  "polo straight": "polo straight",
  "polo jacket": "polo jacket",
  "jogging pants": "jogging pants",
  "jogging pants (kindergarten)": "jogging pants",
  "jogging pants - kindergarten": "jogging pants",
  "jogging pants (preschool)": "jogging pants",
  "jogging pants - preschool": "jogging pants",
  "jogging pants (elementary)": "jogging pants",
  "jogging pants - elementary": "jogging pants",
  "jogging pants (junior high school)": "jogging pants",
  "jogging pants - junior high school": "jogging pants",
  "jogging pants (senior high school)": "jogging pants",
  "jogging pants - senior high school": "jogging pants",
  "jogging pants (college)": "jogging pants",
  "jogging pants - college": "jogging pants",
  "jogging pants (prekindergarten)": "jogging pants",
  "jogging pants - prekindergarten": "jogging pants",
  "small jogging pants": "jogging pants",
  "medium jogging pants": "jogging pants",
  "large jogging pants": "jogging pants",
  "prekindergarten jogging pants": "jogging pants",
  "shorts": "short",
  "necktie (girls)": "necktie girls",
  "necktie (boys)": "necktie boys",
  "number patch (grade level)": "number patch",
  "number patch (per grade)": "number patch",
  "jersey": "jersey",
  "pe jersey": "jersey",
  "jersey (kindergarten)": "jersey",
  "jersey (preschool)": "jersey",
  "id lace (kindergarten)": "id lace",
  "id lace (preschool)": "id lace",
};

function resolveItemKey(name) {
  const n = normalizeItemName(name);
  // Any "X Jogging Pants" (e.g. "Small Jogging Pants") counts as "jogging pants" for limits
  if (n && n.includes("jogging pants")) return "jogging pants";
  // "New Logo Patch (College)" etc. -> "new logo patch"; "Logo Patch (College)" etc. -> "logo patch"
  if (n && n.includes("new logo patch")) return "new logo patch";
  if (n && n.includes("logo patch")) return "logo patch";
  if (ITEM_ALIASES[n]) return ITEM_ALIASES[n];
  return n;
}

// Segment rules: educationLevel_studentType_gender -> { itemKey: maxQty }
const SEGMENT_RULES = {
  // Preschool = Kindergarten
  Kindergarten_new_Female: {
    "kinder dress": 1,
    "kinder necktie": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
  },
  Kindergarten_new_Male: {
    short: 1,
    "polo jacket": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
  },
  Kindergarten_old_Female: {
    "new logo patch": 3,
  },
  Kindergarten_old_Male: {
    "new logo patch": 3,
  },

  // Elementary
  Elementary_new_Female: {
    "elem skirt": 1,
    "elem blouse": 1,
    "ordinary necktie (garter)": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
    "number patch": 3,
  },
  Elementary_new_Male: {
    short: 1,
    "polo jacket": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
    "number patch": 3,
  },
  Elementary_old_Female: {
    "new logo patch": 3,
    "number patch": 3,
  },
  Elementary_old_Male: {
    "new logo patch": 3,
    "number patch": 3,
  },

  // Junior High School
  "Junior High School_new_Female": {
    "jhs skirt": 1,
    "jhs blouse": 1,
    "ordinary necktie (garter)": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
    "number patch": 3,
  },
  "Junior High School_new_Male": {
    short: 1,
    "polo jacket": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
    "number patch": 3,
  },
  "Junior High School_old_Female": {
    "new logo patch": 3,
    "number patch": 3,
  },
  "Junior High School_old_Male": {
    "new logo patch": 3,
    "number patch": 3,
  },

  // Senior High School
  "Senior High School_new_Female": {
    "shs skirt": 1,
    "shs blouse": 1,
    "necktie girls": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
    "number patch": 3,
  },
  "Senior High School_new_Male": {
    "shs pants": 1,
    "shs long-sleeve": 1,
    "necktie boys": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
    "number patch": 3,
  },
  "Senior High School_old_Female": {
    "new logo patch": 3,
    "number patch": 3,
  },
  "Senior High School_old_Male": {
    "new logo patch": 3,
    "number patch": 3,
  },

  // College (and Vocational)
  College_new_Female: {
    "college skirt": 1,
    "college blouse": 1,
    "ordinary necktie": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
  },
  College_new_Male: {
    pants: 1,
    "polo straight": 1,
    jersey: 1,
    "jogging pants": 1,
    "id lace": 1,
    "logo patch": 3,
  },
  College_old_Female: {
    "new logo patch": 3,
  },
  College_old_Male: {
    "new logo patch": 3,
  },
};

// Vocational uses College rules
SEGMENT_RULES.Vocational_new_Female = SEGMENT_RULES.College_new_Female;
SEGMENT_RULES.Vocational_new_Male = SEGMENT_RULES.College_new_Male;
SEGMENT_RULES.Vocational_old_Female = SEGMENT_RULES.College_old_Female;
SEGMENT_RULES.Vocational_old_Male = SEGMENT_RULES.College_old_Male;

/**
 * Get max quantity allowed for an item for a given segment.
 * @param {string} itemName - Item name as stored (e.g. "Kinder Dress", "Logo Patch")
 * @param {string} educationLevel - e.g. "Kindergarten", "Elementary", "Junior High School", "Senior High School", "College", "Vocational"
 * @param {string} studentType - "new" or "old"
 * @param {string} gender - "Male" or "Female"
 * @returns {number} Max quantity (default DEFAULT_MAX if no rule)
 */
function getMaxQuantityForItem(itemName, educationLevel, studentType, gender) {
  const level = (educationLevel || "").trim();
  const effectiveLevel = level === "Vocational" ? "College" : level;
  const key = segmentKey(effectiveLevel, studentType, gender);
  const rules = SEGMENT_RULES[key];
  if (!rules) return DEFAULT_MAX;

  const itemKey = resolveItemKey(itemName);
  if (!itemKey) return DEFAULT_MAX;

  // Exact match first
  if (rules[itemKey] !== undefined) return rules[itemKey];

  // Try normalized form as stored in rules (e.g. "logo patch")
  const normalized = normalizeItemName(itemName);
  if (rules[normalized] !== undefined) return rules[normalized];

  // Old students: "logo patch" (catalog) is the same orderable item as "new logo patch" (segment rule).
  const type = (studentType || "").toLowerCase();
  if (type === "old") {
    if ((itemKey === "logo patch" || normalized === "logo patch") && rules["new logo patch"] !== undefined) {
      return rules["new logo patch"];
    }
    return 0;
  }

  return DEFAULT_MAX;
}

/**
 * Build full maxQuantities map for a segment. Keys are normalized item names; values are max qty.
 * Used by GET /auth/max-quantities to return { maxQuantities: { "kinder dress": 1, ... } }.
 */
function getMaxQuantitiesForStudent(educationLevel, studentType, gender) {
  const level = (educationLevel || "").trim();
  const type = (studentType || "new").toLowerCase();
  const g = (gender || "").trim();
  const effectiveLevel = level === "Vocational" ? "College" : level;
  const key = segmentKey(effectiveLevel, type, g);
  const rules = SEGMENT_RULES[key];
  if (!rules) return {};

  const out = {};
  for (const [itemKey, maxQty] of Object.entries(rules)) {
    out[normalizeItemName(itemKey) || itemKey] = maxQty;
  }
  // Old students: catalog may list "Logo Patch (College)" which resolves to "logo patch"; allow it via "new logo patch" rule.
  if (type === "old" && rules["new logo patch"] !== undefined && out["logo patch"] === undefined) {
    out["logo patch"] = rules["new logo patch"];
  }
  return out;
}

module.exports = {
  getMaxQuantityForItem,
  getMaxQuantitiesForStudent,
  normalizeItemName,
  resolveItemKey,
  DEFAULT_MAX,
};
