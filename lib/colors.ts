"use client";

/**
 * Dominant-color extraction with a canvas — free, offline, no dependencies.
 * We downscale the image, ignore near-white/transparent edges (typical of
 * product shots), and bucket pixels into a coarse histogram.
 */

const NAMED_COLORS: Array<{ name: string; rgb: [number, number, number] }> = [
  { name: "black", rgb: [20, 20, 20] },
  { name: "white", rgb: [245, 245, 245] },
  { name: "grey", rgb: [128, 128, 128] },
  { name: "red", rgb: [200, 40, 40] },
  { name: "burgundy", rgb: [110, 30, 50] },
  { name: "orange", rgb: [235, 130, 40] },
  { name: "yellow", rgb: [230, 200, 60] },
  { name: "green", rgb: [70, 140, 80] },
  { name: "olive", rgb: [110, 115, 60] },
  { name: "teal", rgb: [50, 130, 130] },
  { name: "blue", rgb: [60, 100, 190] },
  { name: "navy", rgb: [35, 45, 90] },
  { name: "purple", rgb: [130, 80, 170] },
  { name: "pink", rgb: [230, 150, 180] },
  { name: "brown", rgb: [120, 80, 50] },
  { name: "beige", rgb: [215, 200, 170] },
  { name: "cream", rgb: [245, 238, 220] },
  // alias shades: extra reference points that map to the same names, so
  // pale/dark garments land on the right family (keep after the canonical
  // entries — colorFromText picks the first entry per name)
  { name: "blue", rgb: [190, 210, 235] }, // pale blue
  { name: "blue", rgb: [95, 130, 180] }, // denim
  { name: "pink", rgb: [242, 215, 220] }, // pale pink
  { name: "green", rgb: [40, 75, 50] }, // dark green
  { name: "grey", rgb: [75, 75, 80] }, // charcoal
  { name: "grey", rgb: [200, 200, 202] }, // light grey
  { name: "purple", rgb: [205, 195, 230] }, // lilac
  { name: "yellow", rgb: [245, 230, 160] }, // pale yellow
];

export const NEUTRAL_COLOR_NAMES = new Set([
  "black",
  "white",
  "grey",
  "navy",
  "beige",
  "cream",
  "brown",
]);

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

/** Synonyms mapping shop color vocabulary onto our named palette. */
const COLOR_SYNONYMS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bnavy\b|dark blue|midnight/, name: "navy" },
  { pattern: /\bburgundy\b|maroon|\bwine\b|bordeaux/, name: "burgundy" },
  { pattern: /off[- ]?white|ivory|ecru/, name: "cream" },
  { pattern: /\bcream\b/, name: "cream" },
  { pattern: /\bkhaki\b|\bolive\b|army green/, name: "olive" },
  { pattern: /\btan\b|\bcamel\b|\bsand\b|natural/, name: "beige" },
  { pattern: /\bbeige\b/, name: "beige" },
  { pattern: /charcoal|gr[ae]y/, name: "grey" },
  { pattern: /\bteal\b|turquoise|petrol/, name: "teal" },
  { pattern: /\bblack\b/, name: "black" },
  { pattern: /\bwhite\b/, name: "white" },
  { pattern: /\bred\b|scarlet/, name: "red" },
  { pattern: /\borange\b|\brust\b/, name: "orange" },
  { pattern: /\byellow\b|mustard/, name: "yellow" },
  { pattern: /\bgreen\b/, name: "green" },
  { pattern: /\bblue\b|cobalt|azure/, name: "blue" },
  { pattern: /\bpurple\b|violet|lilac|lavender/, name: "purple" },
  { pattern: /\bpink\b|\brose\b|blush/, name: "pink" },
  { pattern: /\bbrown\b|chocolate|mocha/, name: "brown" },
];

/**
 * Find a named color mentioned in free text (a shop's color field or a
 * product title). Returns our palette name + representative hex, or null.
 */
export function colorFromText(
  text: string
): { name: string; hex: string } | null {
  const t = text.toLowerCase();
  for (const s of COLOR_SYNONYMS) {
    if (s.pattern.test(t)) {
      const named = NAMED_COLORS.find((c) => c.name === s.name);
      if (named) return { name: named.name, hex: rgbToHex(...named.rgb) };
    }
  }
  return null;
}

export function nearestColorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const d =
      (r - c.rgb[0]) ** 2 + (g - c.rgb[1]) ** 2 + (b - c.rgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.name;
}

/**
 * Extract dominant colors with node-vibrant (open-source MMCQ palette
 * extraction) on a background-masked copy of the image: we sample the
 * corners for the studio-background color, make those pixels transparent,
 * and let Vibrant quantize what's left — i.e. the garment. Falls back to a
 * simple histogram if Vibrant can't produce a palette.
 */
export async function extractDominantColors(
  blob: Blob,
  count = 3
): Promise<string[]> {
  try {
    const src = await maskBackgroundToDataUrl(blob);
    const { Vibrant } = await import("node-vibrant/browser");
    const palette = await Vibrant.from(src).getPalette();
    const swatches = Object.values(palette)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .sort((a, b) => b.population - a.population);
    if (swatches.length > 0) {
      return swatches.slice(0, count).map((s) => s.hex);
    }
  } catch {
    // fall through to histogram
  }
  return histogramColors(blob, count);
}

/**
 * Downscale the image and turn background-like pixels (matching the corner
 * colors) transparent. Returns a data URL; if masking would remove nearly
 * everything (garment matches the background), returns the unmasked image.
 */
async function maskBackgroundToDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const corner = (x: number, y: number) => {
    const i = (y * size + x) * 4;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]] as const;
  };
  const corners = [
    corner(4, 4),
    corner(size - 5, 4),
    corner(4, size - 5),
    corner(size - 5, size - 5),
  ];
  let kept = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const isBg = corners.some(([cr, cg, cb, ca]) => {
      if (ca < 128) return false;
      return (
        (d[i] - cr) ** 2 + (d[i + 1] - cg) ** 2 + (d[i + 2] - cb) ** 2 < 900
      );
    });
    if (isBg) d[i + 3] = 0;
    else kept++;
  }
  if (kept < size * size * 0.05) {
    // garment ~= background; use the original image instead
    return canvas.toDataURL();
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

/** Previous coarse-histogram extraction, kept as a dependency-free fallback. */
async function histogramColors(blob: Blob, count = 3): Promise<string[]> {
  const bitmap = await createImageBitmap(blob);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return ["#888888"];
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, size, size);

  const px = (x: number, y: number) => {
    const i = (y * size + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };

  // Product shots have a uniform studio background (white, light grey, …).
  // Sample the four corners and suppress background-like pixels anywhere
  // in the frame so the garment dominates the histogram.
  const cornerSamples: Array<readonly [number, number, number, number]> = [];
  for (const [cx, cy] of [
    [2, 2],
    [size - 3, 2],
    [2, size - 3],
    [size - 3, size - 3],
  ] as const) {
    cornerSamples.push(px(cx, cy));
  }
  const isBackground = (r: number, g: number, b: number) =>
    cornerSamples.some(([cr, cg, cb, ca]) => {
      if (ca < 128) return false;
      return (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2 < 900; // ~30 per channel
    });

  const collect = (skipBackground: boolean) => {
    const buckets = new Map<
      string,
      { r: number; g: number; b: number; n: number }
    >();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [r, g, b, a] = px(x, y);
        if (a < 128) continue;
        if (skipBackground && isBackground(r, g, b)) continue;
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.n += 1;
        buckets.set(key, bucket);
      }
    }
    return buckets;
  };

  let buckets = collect(true);
  const kept = [...buckets.values()].reduce((acc, b) => acc + b.n, 0);
  // If suppression removed almost everything (e.g. a white shirt on a white
  // background), fall back to the full histogram.
  if (kept < size * size * 0.05) buckets = collect(false);

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  if (sorted.length === 0) return ["#888888"];
  return sorted
    .slice(0, count)
    .map((b) =>
      rgbToHex(
        Math.round(b.r / b.n),
        Math.round(b.g / b.n),
        Math.round(b.b / b.n)
      )
    );
}

/** Rough hue (0-360) and saturation (0-1) for color-harmony scoring. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}
