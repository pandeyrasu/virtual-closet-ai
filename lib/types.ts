export type Category =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "bag"
  | "accessory";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type Occasion = "casual" | "work" | "sport" | "party";

/** 1 = light (hot weather), 2 = medium, 3 = warm (cold weather) */
export type Warmth = 1 | 2 | 3;

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  /** e.g. "t-shirt", "jeans", "sneakers" */
  subcategory: string;
  /** dominant colors as hex strings, most dominant first */
  colors: string[];
  colorName: string;
  warmth: Warmth;
  seasons: Season[];
  occasions: Occasion[];
  /** how confident the auto-classifier was (0..1); 0 = user set manually */
  confidence: number;
  /** fabric composition from the shop page, e.g. "100% cotton" */
  material: string | null;
  image: Blob;
  favorite: boolean;
  wearCount: number;
  lastWorn: number | null;
  createdAt: number;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  /** ISO date this outfit was suggested/saved for */
  date: string;
  score: number;
  reason: string;
  tryonPhotoId: string | null;
  createdAt: number;
}

export interface TryonPhoto {
  id: string;
  image: Blob;
  /** which closet items are worn in this photo */
  itemIds: string[];
  note: string;
  createdAt: number;
}

export interface WeatherSnapshot {
  tempMax: number;
  tempMin: number;
  feelsLike: number;
  precipitationChance: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  locationName: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  top: "Tops",
  bottom: "Bottoms",
  dress: "Dresses",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bag: "Bags",
  accessory: "Accessories",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
export const ALL_OCCASIONS: Occasion[] = ["casual", "work", "sport", "party"];
export const ALL_SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
