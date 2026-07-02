import type {
  ClothingItem,
  Occasion,
  Season,
  Warmth,
  WeatherSnapshot,
} from "./types";
import { hexToHsl, NEUTRAL_COLOR_NAMES, nearestColorName } from "./colors";
import { trendsForSeason, type TrendHint } from "./trends";

export interface OutfitSuggestion {
  items: ClothingItem[];
  score: number;
  reasons: string[];
}

export interface SuggestionContext {
  weather: WeatherSnapshot | null;
  season: Season;
  occasion: Occasion;
}

/** Map today's feels-like temperature to a target warmth level. */
export function targetWarmth(weather: WeatherSnapshot | null): Warmth {
  if (!weather) return 2;
  if (weather.feelsLike >= 19) return 1;
  if (weather.feelsLike >= 9) return 2;
  return 3;
}

function isRainy(weather: WeatherSnapshot | null): boolean {
  if (!weather) return false;
  return (
    weather.precipitationChance >= 45 ||
    [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      weather.weatherCode
    )
  );
}

function warmthScore(item: ClothingItem, target: Warmth): number {
  return 1 - Math.abs(item.warmth - target) / 2; // 1 exact, 0.5 off-by-one, 0 opposite
}

function daysSinceWorn(item: ClothingItem, now: number): number {
  if (!item.lastWorn) return 30;
  return (now - item.lastWorn) / 86_400_000;
}

/** Color harmony: neutrals go with everything; otherwise compare hues. */
function colorHarmony(items: ClothingItem[]): number {
  const accents = items
    .map((i) => i.colors[0])
    .filter((hex) => hex && !NEUTRAL_COLOR_NAMES.has(nearestColorName(hex)));
  if (accents.length <= 1) return 1; // all-neutral or single accent: safe
  let total = 0;
  let pairs = 0;
  for (let a = 0; a < accents.length; a++) {
    for (let b = a + 1; b < accents.length; b++) {
      const h1 = hexToHsl(accents[a]).h;
      const h2 = hexToHsl(accents[b]).h;
      let diff = Math.abs(h1 - h2);
      if (diff > 180) diff = 360 - diff;
      // analogous (<40°) or complementary (~180°) reads as intentional
      const good = diff < 40 || diff > 150 ? 1 : diff < 80 ? 0.5 : 0.2;
      total += good;
      pairs++;
    }
  }
  return pairs ? total / pairs : 1;
}

function isMonochrome(items: ClothingItem[]): boolean {
  const names = new Set(
    items
      .filter((i) => i.category !== "accessory" && i.category !== "bag")
      .map((i) => i.colorName)
  );
  return names.size <= 1;
}

function trendBonus(items: ClothingItem[], trends: TrendHint[]): {
  bonus: number;
  matched: TrendHint[];
} {
  const matched: TrendHint[] = [];
  for (const t of trends) {
    if (t.monochrome) {
      if (isMonochrome(items)) matched.push(t);
      continue;
    }
    const subHits = t.subcategories
      ? items.filter((i) => t.subcategories!.includes(i.subcategory)).length
      : 0;
    const colorHits = t.colors
      ? items.filter((i) => t.colors!.includes(i.colorName)).length
      : 0;
    if (subHits >= 2 || (subHits >= 1 && colorHits >= 2)) matched.push(t);
  }
  return { bonus: Math.min(matched.length * 0.5, 1), matched };
}

function pickWeighted<T>(arr: T[], weight: (t: T) => number): T | null {
  if (arr.length === 0) return null;
  const weights = arr.map((t) => Math.max(weight(t), 0.01));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function scoreOutfit(
  items: ClothingItem[],
  ctx: SuggestionContext,
  target: Warmth,
  rainy: boolean,
  trends: TrendHint[],
  now: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Weather fit (0..3)
  const wScore =
    items.reduce((acc, i) => acc + warmthScore(i, target), 0) / items.length;
  score += wScore * 3;
  if (ctx.weather) {
    if (wScore > 0.8)
      reasons.push(
        `Matched to ${Math.round(ctx.weather.feelsLike)}°C (feels like) and ${ctx.weather.description.toLowerCase()}`
      );
    if (rainy) {
      const hasRainLayer = items.some((i) =>
        ["raincoat", "trench coat", "puffer jacket", "winter coat"].includes(
          i.subcategory
        )
      );
      const hasRainProofShoes = items.some((i) =>
        ["ankle boots", "winter boots", "sneakers", "loafers"].includes(i.subcategory)
      );
      if (hasRainLayer) {
        score += 0.8;
        reasons.push("Includes a rain-friendly layer");
      }
      if (items.some((i) => i.subcategory === "sandals")) score -= 1.5;
      else if (hasRainProofShoes) score += 0.3;
    }
  }

  // Season fit (0..1.5)
  const seasonScore =
    items.filter((i) => i.seasons.includes(ctx.season)).length / items.length;
  score += seasonScore * 1.5;
  if (seasonScore === 1) reasons.push(`Everything suits ${ctx.season}`);

  // Occasion fit (0..2)
  const occScore =
    items.filter((i) => i.occasions.includes(ctx.occasion)).length /
    items.length;
  score += occScore * 2;
  if (occScore >= 0.75) reasons.push(`Works for a ${ctx.occasion} day`);

  // Color harmony (0..1.5)
  const harmony = colorHarmony(items);
  score += harmony * 1.5;
  if (harmony >= 0.9 && items.length > 1) reasons.push("Colors work well together");

  // Trends (0..1)
  const { bonus, matched } = trendBonus(items, trends);
  score += bonus;
  for (const t of matched) reasons.push(`On trend: ${t.description}`);

  // Freshness: reward items not worn recently (0..1)
  const freshness =
    items.reduce((acc, i) => acc + Math.min(daysSinceWorn(i, now), 14) / 14, 0) /
    items.length;
  score += freshness;
  if (freshness > 0.9) reasons.push("You haven't worn these in a while");

  // Favorites nudge
  if (items.some((i) => i.favorite)) score += 0.3;

  return { score, reasons };
}

/**
 * Generate outfit suggestions: sample candidate combinations weighted by
 * per-item fit, score each full outfit, return the top distinct ones.
 */
export function suggestOutfits(
  closet: ClothingItem[],
  ctx: SuggestionContext,
  count = 3
): OutfitSuggestion[] {
  const now = Date.now();
  const target = targetWarmth(ctx.weather);
  const rainy = isRainy(ctx.weather);
  const trends = trendsForSeason(ctx.season);

  const byCat = (c: ClothingItem["category"]) =>
    closet.filter((i) => i.category === c);

  const tops = byCat("top");
  const bottoms = byCat("bottom");
  const dresses = byCat("dress");
  const outerwear = byCat("outerwear");
  const shoes = byCat("shoes");
  const bags = byCat("bag");
  const accessories = byCat("accessory");

  const canDress = dresses.length > 0;
  const canSeparates = tops.length > 0 && bottoms.length > 0;
  if (!canDress && !canSeparates) return [];

  const itemWeight = (i: ClothingItem) =>
    0.2 +
    warmthScore(i, target) +
    (i.seasons.includes(ctx.season) ? 0.5 : 0) +
    (i.occasions.includes(ctx.occasion) ? 0.5 : 0);

  const candidates: OutfitSuggestion[] = [];
  const attempts = 40;

  for (let n = 0; n < attempts; n++) {
    const items: ClothingItem[] = [];
    const useDress = canDress && (!canSeparates || Math.random() < 0.35);

    if (useDress) {
      const d = pickWeighted(dresses, itemWeight);
      if (d) items.push(d);
    } else {
      const t = pickWeighted(tops, itemWeight);
      const b = pickWeighted(bottoms, itemWeight);
      if (t) items.push(t);
      if (b) items.push(b);
    }

    // Outerwear when cold or rainy (or sometimes in-between weather)
    const wantsLayer = target === 3 || rainy || (target === 2 && Math.random() < 0.5);
    if (wantsLayer && outerwear.length > 0) {
      const o = pickWeighted(outerwear, itemWeight);
      if (o) items.push(o);
    }

    if (shoes.length > 0) {
      const s = pickWeighted(shoes, itemWeight);
      if (s) items.push(s);
    }
    if (bags.length > 0 && Math.random() < 0.6) {
      const b = pickWeighted(bags, itemWeight);
      if (b) items.push(b);
    }
    if (accessories.length > 0 && Math.random() < 0.5) {
      const a = pickWeighted(accessories, itemWeight);
      if (a) items.push(a);
    }

    if (items.length < 2) continue;
    const { score, reasons } = scoreOutfit(items, ctx, target, rainy, trends, now);
    candidates.push({ items, score, reasons });
  }

  // Dedupe by item-id signature, keep highest score first.
  const seen = new Set<string>();
  const distinct: OutfitSuggestion[] = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    const sig = c.items.map((i) => i.id).sort().join("|");
    if (seen.has(sig)) continue;
    seen.add(sig);
    distinct.push(c);
    if (distinct.length >= count) break;
  }
  return distinct;
}
