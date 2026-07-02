import type { Category, Occasion, Season, Warmth } from "./types";

export interface SubcategoryInfo {
  label: string;
  category: Category;
  warmth: Warmth;
  seasons: Season[];
  occasions: Occasion[];
}

/**
 * The zero-shot vocabulary. Each entry becomes a candidate label for CLIP
 * ("a photo of a t-shirt", ...) and carries the metadata we derive from it.
 */
export const TAXONOMY: SubcategoryInfo[] = [
  // tops
  { label: "t-shirt", category: "top", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "sport"] },
  { label: "tank top", category: "top", warmth: 1, seasons: ["summer"], occasions: ["casual", "sport"] },
  { label: "button-up shirt", category: "top", warmth: 1, seasons: ["spring", "summer", "autumn"], occasions: ["work", "casual"] },
  { label: "blouse", category: "top", warmth: 1, seasons: ["spring", "summer", "autumn"], occasions: ["work", "party"] },
  { label: "polo shirt", category: "top", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "work"] },
  { label: "sweater", category: "top", warmth: 3, seasons: ["autumn", "winter"], occasions: ["casual", "work"] },
  { label: "hoodie", category: "top", warmth: 2, seasons: ["autumn", "winter", "spring"], occasions: ["casual", "sport"] },
  { label: "sweatshirt", category: "top", warmth: 2, seasons: ["autumn", "winter", "spring"], occasions: ["casual", "sport"] },
  { label: "long sleeve top", category: "top", warmth: 2, seasons: ["spring", "autumn"], occasions: ["casual", "work"] },
  { label: "crop top", category: "top", warmth: 1, seasons: ["summer"], occasions: ["casual", "party"] },

  // bottoms
  { label: "jeans", category: "bottom", warmth: 2, seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual"] },
  { label: "trousers", category: "bottom", warmth: 2, seasons: ["spring", "autumn", "winter"], occasions: ["work", "casual"] },
  { label: "shorts", category: "bottom", warmth: 1, seasons: ["summer"], occasions: ["casual", "sport"] },
  { label: "skirt", category: "bottom", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "work", "party"] },
  { label: "leggings", category: "bottom", warmth: 2, seasons: ["spring", "autumn", "winter"], occasions: ["sport", "casual"] },
  { label: "sweatpants", category: "bottom", warmth: 2, seasons: ["autumn", "winter"], occasions: ["casual", "sport"] },

  // dresses
  { label: "summer dress", category: "dress", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "party"] },
  { label: "evening dress", category: "dress", warmth: 1, seasons: ["spring", "summer", "autumn"], occasions: ["party"] },
  { label: "knit dress", category: "dress", warmth: 3, seasons: ["autumn", "winter"], occasions: ["casual", "work"] },
  { label: "jumpsuit", category: "dress", warmth: 2, seasons: ["spring", "summer", "autumn"], occasions: ["casual", "party", "work"] },

  // outerwear
  { label: "denim jacket", category: "outerwear", warmth: 2, seasons: ["spring", "autumn"], occasions: ["casual"] },
  { label: "leather jacket", category: "outerwear", warmth: 2, seasons: ["spring", "autumn"], occasions: ["casual", "party"] },
  { label: "blazer", category: "outerwear", warmth: 2, seasons: ["spring", "autumn"], occasions: ["work", "party"] },
  { label: "cardigan", category: "outerwear", warmth: 2, seasons: ["spring", "autumn"], occasions: ["casual", "work"] },
  { label: "winter coat", category: "outerwear", warmth: 3, seasons: ["winter"], occasions: ["casual", "work"] },
  { label: "puffer jacket", category: "outerwear", warmth: 3, seasons: ["winter"], occasions: ["casual"] },
  { label: "trench coat", category: "outerwear", warmth: 2, seasons: ["spring", "autumn"], occasions: ["work", "casual"] },
  { label: "raincoat", category: "outerwear", warmth: 2, seasons: ["spring", "autumn"], occasions: ["casual"] },

  // shoes
  { label: "sneakers", category: "shoes", warmth: 2, seasons: ["spring", "summer", "autumn"], occasions: ["casual", "sport"] },
  { label: "ankle boots", category: "shoes", warmth: 3, seasons: ["autumn", "winter"], occasions: ["casual", "work"] },
  { label: "winter boots", category: "shoes", warmth: 3, seasons: ["winter"], occasions: ["casual"] },
  { label: "high heels", category: "shoes", warmth: 1, seasons: ["spring", "summer", "autumn"], occasions: ["party", "work"] },
  { label: "sandals", category: "shoes", warmth: 1, seasons: ["summer"], occasions: ["casual"] },
  { label: "loafers", category: "shoes", warmth: 2, seasons: ["spring", "summer", "autumn"], occasions: ["work", "casual"] },
  { label: "ballet flats", category: "shoes", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "work"] },

  // bags
  { label: "handbag", category: "bag", warmth: 1, seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "work", "party"] },
  { label: "backpack", category: "bag", warmth: 1, seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "sport"] },
  { label: "tote bag", category: "bag", warmth: 1, seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "work"] },

  // accessories
  { label: "scarf", category: "accessory", warmth: 3, seasons: ["autumn", "winter"], occasions: ["casual", "work"] },
  { label: "beanie hat", category: "accessory", warmth: 3, seasons: ["winter"], occasions: ["casual"] },
  { label: "sun hat", category: "accessory", warmth: 1, seasons: ["summer"], occasions: ["casual"] },
  { label: "baseball cap", category: "accessory", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "sport"] },
  { label: "belt", category: "accessory", warmth: 1, seasons: ["spring", "summer", "autumn", "winter"], occasions: ["casual", "work"] },
  { label: "sunglasses", category: "accessory", warmth: 1, seasons: ["spring", "summer"], occasions: ["casual", "party"] },
  { label: "necklace", category: "accessory", warmth: 1, seasons: ["spring", "summer", "autumn", "winter"], occasions: ["party", "work", "casual"] },
];

export function subcategoryInfo(label: string): SubcategoryInfo | undefined {
  return TAXONOMY.find((t) => t.label === label);
}

/**
 * Keyword rules for deriving the subcategory from a product title
 * (e.g. "Womens Pleated Sleeveless T-Shirt" -> tank top). Shop titles are
 * far more reliable than image classification, so a hit here wins over
 * the CLIP guess. Order matters: more specific patterns come first.
 */
const TEXT_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /dress shirt|button[- ]?(up|down)|oxford shirt/, label: "button-up shirt" },
  { pattern: /shirt dress|t[- ]?shirt dress/, label: "summer dress" },
  { pattern: /sleeveless|tank|camisole|\bcami\b|vest top/, label: "tank top" },
  { pattern: /polo/, label: "polo shirt" },
  { pattern: /t[- ]?shirt|\btee\b/, label: "t-shirt" },
  { pattern: /blouse/, label: "blouse" },
  { pattern: /crop top|cropped top/, label: "crop top" },
  { pattern: /hoodie/, label: "hoodie" },
  { pattern: /sweatshirt|crew ?neck sweat/, label: "sweatshirt" },
  { pattern: /cardigan/, label: "cardigan" },
  { pattern: /sweater|jumper|pullover|knitted top|knit top/, label: "sweater" },
  { pattern: /long[- ]sleeve/, label: "long sleeve top" },
  { pattern: /\bshirt\b/, label: "button-up shirt" },
  { pattern: /jeans|denim pants/, label: "jeans" },
  { pattern: /shorts/, label: "shorts" },
  { pattern: /leggings|tights/, label: "leggings" },
  { pattern: /sweatpants|joggers|track pants/, label: "sweatpants" },
  { pattern: /trousers|chinos|slacks|\bpants\b/, label: "trousers" },
  { pattern: /skirt/, label: "skirt" },
  { pattern: /jumpsuit|playsuit|romper|overall/, label: "jumpsuit" },
  { pattern: /knit dress|sweater dress/, label: "knit dress" },
  { pattern: /evening dress|gown|cocktail dress/, label: "evening dress" },
  { pattern: /dress/, label: "summer dress" },
  { pattern: /denim jacket/, label: "denim jacket" },
  { pattern: /leather jacket|biker jacket/, label: "leather jacket" },
  { pattern: /blazer|suit jacket/, label: "blazer" },
  { pattern: /puffer|down jacket|padded jacket|quilted jacket/, label: "puffer jacket" },
  { pattern: /trench/, label: "trench coat" },
  { pattern: /raincoat|rain jacket|anorak/, label: "raincoat" },
  { pattern: /parka|winter coat|wool coat|overcoat|\bcoat\b/, label: "winter coat" },
  { pattern: /jacket/, label: "denim jacket" },
  { pattern: /sneakers?|trainers?|running shoes/, label: "sneakers" },
  { pattern: /chelsea boots|ankle boots/, label: "ankle boots" },
  { pattern: /snow boots|winter boots|\bboots?\b/, label: "winter boots" },
  { pattern: /heels|pumps|stiletto/, label: "high heels" },
  { pattern: /sandals?|slides|flip[- ]?flops/, label: "sandals" },
  { pattern: /loafers?|moccasin/, label: "loafers" },
  { pattern: /ballet flats|ballerinas|\bflats\b/, label: "ballet flats" },
  { pattern: /backpack|rucksack/, label: "backpack" },
  { pattern: /tote/, label: "tote bag" },
  { pattern: /handbag|shoulder bag|crossbody|\bbag\b|purse/, label: "handbag" },
  { pattern: /scarf|shawl/, label: "scarf" },
  { pattern: /beanie/, label: "beanie hat" },
  { pattern: /baseball cap|\bcap\b/, label: "baseball cap" },
  { pattern: /sun hat|bucket hat|straw hat|\bhat\b/, label: "sun hat" },
  { pattern: /belt/, label: "belt" },
  { pattern: /sunglasses/, label: "sunglasses" },
  { pattern: /necklace|pendant|choker/, label: "necklace" },
];

/** Derive a subcategory from free text (product title); null if no rule hits. */
export function matchTaxonomyFromText(text: string): SubcategoryInfo | null {
  const t = text.toLowerCase();
  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(t)) return subcategoryInfo(rule.label) ?? null;
  }
  return null;
}

export function subcategoriesFor(category: Category): SubcategoryInfo[] {
  return TAXONOMY.filter((t) => t.category === category);
}
