/**
 * Master list of all uniform items (deduplicated).
 * Extracted from segment rules: Preschool, Elementary, JHS, SHS, College (New/Old, Girls/Boys).
 * Keys are normalized (lowercase, single spaces) for consistency with itemMaxOrder.js.
 *
 * Duplicates removed:
 * - "Logo Patch" / "logo patch" → logo patch
 * - "number patch (grade level)" / "number patch (per grade)" → number patch
 */
const ITEM_MASTER_LIST = [
  "kinder dress",
  "kinder necktie",
  "jersey",
  "jogging pants",
  "id lace",
  "short",
  "polo jacket",
  "logo patch",
  "new logo patch",
  "elem skirt",
  "elem blouse",
  "ordinary necktie (garter)",
  "number patch",
  "jhs skirt",
  "jhs blouse",
  "necktie girls",
  "shs skirt",
  "shs blouse",
  "shs pants",
  "shs long-sleeve",
  "necktie boys",
  "college skirt",
  "college blouse",
  "ordinary necktie",
  "pants",
  "polo straight",
];

/** Normalize for lookup: lowercase, collapse spaces, trim */
function normalizeName(name) {
  if (!name || typeof name !== "string") return "";
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Check if a name (after normalization) is in the master list */
function isKnownItem(name) {
  const n = normalizeName(name);
  return ITEM_MASTER_LIST.some((item) => normalizeName(item) === n);
}

module.exports = {
  ITEM_MASTER_LIST,
  isKnownItem,
  normalizeName,
};
