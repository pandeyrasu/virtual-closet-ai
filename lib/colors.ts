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

export async function extractDominantColors(
  blob: Blob,
  count = 3
): Promise<string[]> {
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
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 128) continue;
      // Skip near-white pixels near the border (product-shot background).
      const nearEdge = x < 6 || y < 6 || x >= size - 6 || y >= size - 6;
      const isNearWhite = r > 235 && g > 235 && b > 235;
      if (nearEdge && isNearWhite) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
      buckets.set(key, bucket);
    }
  }

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
