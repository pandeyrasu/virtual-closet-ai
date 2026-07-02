import type { Season } from "./types";

/**
 * Lightweight, hand-curated trend hints per season. Free by definition —
 * no trend API exists without a paid tier, so we encode style heuristics
 * the engine can use as a soft scoring bonus. Edit freely to taste.
 */

export interface TrendHint {
  id: string;
  description: string;
  seasons: Season[];
  /** subcategory labels that get a bonus */
  subcategories?: string[];
  /** color names that get a bonus */
  colors?: string[];
  /** bonus applies when the whole outfit is (near-)monochrome */
  monochrome?: boolean;
}

export const TREND_HINTS: TrendHint[] = [
  {
    id: "quiet-luxury",
    description: "Quiet luxury: tonal neutrals, tailored trousers, loafers",
    seasons: ["spring", "summer", "autumn", "winter"],
    subcategories: ["trousers", "blazer", "loafers", "button-up shirt"],
    colors: ["beige", "cream", "brown", "white", "grey"],
  },
  {
    id: "monochrome",
    description: "Head-to-toe monochrome looks",
    seasons: ["spring", "summer", "autumn", "winter"],
    monochrome: true,
  },
  {
    id: "denim-refresh",
    description: "Denim-forward styling",
    seasons: ["spring", "autumn"],
    subcategories: ["jeans", "denim jacket"],
  },
  {
    id: "summer-linen",
    description: "Breezy, light layers and sandals",
    seasons: ["summer"],
    subcategories: ["summer dress", "shorts", "sandals", "sun hat"],
    colors: ["white", "cream", "beige", "blue"],
  },
  {
    id: "winter-texture",
    description: "Chunky knits and long coats",
    seasons: ["winter"],
    subcategories: ["sweater", "winter coat", "knit dress", "scarf", "ankle boots"],
  },
  {
    id: "sporty-street",
    description: "Athleisure streetwear",
    seasons: ["spring", "summer", "autumn"],
    subcategories: ["sneakers", "hoodie", "sweatpants", "baseball cap"],
  },
];

export function trendsForSeason(season: Season): TrendHint[] {
  return TREND_HINTS.filter((t) => t.seasons.includes(season));
}
