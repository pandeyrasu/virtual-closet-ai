import { NextRequest, NextResponse } from "next/server";
import {
  BROWSER_HEADERS,
  isAllowedUrl,
  type ScrapedProduct,
} from "@/lib/scrape-shared";

export const runtime = "nodejs";

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|$)/i;
const NOISE = /(logo|icon|sprite|favicon|placeholder|badge|banner|1x1|pixel)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Parse all <meta> tags into (property|name) -> content[] */
function parseMeta(html: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const tagRe = /<meta\s[^>]*>/gi;
  for (const [tag] of html.matchAll(tagRe)) {
    const key =
      tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!key || !content) continue;
    const list = map.get(key) ?? [];
    list.push(decodeEntities(content));
    map.set(key, list);
  }
  return map;
}

interface LdProduct {
  name?: string;
  brand?: string;
  color?: string;
  material?: string;
  images: string[];
}

const KNOWN_FIBERS =
  /(cotton|polyester|wool|linen|nylon|elastane|spandex|viscose|rayon|acrylic|cashmere|silk|lyocell|modal|polyamide|leather|down|hemp|tencel|polyurethane)/i;

/**
 * Find a fabric composition like "100% Cotton" or
 * "65% Polyester, 35% Cotton" in the page text. Parses individual
 * "NN% Fiber" components and groups adjacent ones, so surrounding prose
 * ("Machine wash at 30°C") doesn't leak into the result.
 */
function findComposition(html: string): string | null {
  // strip tags/scripts so we match visible-ish text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  interface Part {
    start: number;
    end: number;
    text: string;
    known: boolean;
  }
  const parts: Part[] = [];
  const partRe = /(\d{1,3})\s*%\s*([A-Za-z][A-Za-z-]*)(?:[ \t]([A-Za-z][A-Za-z-]*))?/g;
  for (const m of text.matchAll(partRe)) {
    const [, pct, first, second] = m;
    // Two-word fibers ("Merino Wool", "Recycled Polyester") keep the second
    // word only when it's the known fiber; otherwise it's trailing prose.
    let fiber = first;
    if (second && !KNOWN_FIBERS.test(first) && KNOWN_FIBERS.test(second)) {
      fiber = `${first} ${second}`;
    }
    parts.push({
      start: m.index,
      end: m.index + m[0].indexOf(fiber.split(" ").pop()!) + fiber.split(" ").pop()!.length,
      text: `${pct}% ${fiber}`,
      known: KNOWN_FIBERS.test(fiber),
    });
  }

  // Group components separated only by ",", "/", "&", "+" or "and".
  let best: Part[] = [];
  let group: Part[] = [];
  for (const p of parts) {
    const prev = group[group.length - 1];
    const gap = prev ? text.slice(prev.end, p.start) : "";
    if (prev && !/^\s*(?:[,/&+·]|and)?\s*$/.test(gap)) group = [];
    group = [...group, p];
    if (
      group.some((g) => g.known) &&
      (group.length > best.length ||
        (group.length === best.length &&
          group.filter((g) => g.known).length > best.filter((g) => g.known).length))
    ) {
      best = group;
    }
  }
  return best.length ? best.map((p) => p.text).join(", ") : null;
}

/** Extract Product data from JSON-LD blocks (handles arrays and @graph). */
function parseJsonLd(html: string): LdProduct | null {
  const re =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const nodes: unknown[] = [];
  for (const [, body] of html.matchAll(re)) {
    try {
      const parsed = JSON.parse(body.trim());
      nodes.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // ignore malformed blocks
    }
  }
  const flat: Record<string, unknown>[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    const obj = n as Record<string, unknown>;
    flat.push(obj);
    if (Array.isArray(obj["@graph"])) {
      for (const g of obj["@graph"]) {
        if (g && typeof g === "object") flat.push(g as Record<string, unknown>);
      }
    }
  }
  for (const obj of flat) {
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (!types.includes("Product")) continue;
    const images: string[] = [];
    const raw = obj.image;
    const collect = (v: unknown) => {
      if (typeof v === "string") images.push(v);
      else if (v && typeof v === "object") {
        const u = (v as Record<string, unknown>).url;
        if (typeof u === "string") images.push(u);
      }
    };
    if (Array.isArray(raw)) raw.forEach(collect);
    else collect(raw);
    const brandRaw = obj.brand;
    const brand =
      typeof brandRaw === "string"
        ? brandRaw
        : brandRaw && typeof brandRaw === "object"
          ? String((brandRaw as Record<string, unknown>).name ?? "") || undefined
          : undefined;
    const colorRaw = obj.color;
    const color =
      typeof colorRaw === "string"
        ? colorRaw
        : Array.isArray(colorRaw) && typeof colorRaw[0] === "string"
          ? colorRaw[0]
          : undefined;
    return {
      name: typeof obj.name === "string" ? obj.name : undefined,
      brand,
      color,
      material: typeof obj.material === "string" ? obj.material : undefined,
      images,
    };
  }
  return null;
}

/** Collect plausible product images from plain <img> tags. */
function parseImgTags(html: string, base: URL): string[] {
  const out: string[] = [];
  for (const [tag] of html.matchAll(/<img\s[^>]*>/gi)) {
    const src =
      tag.match(/(?:data-src|data-original|src)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src || src.startsWith("data:")) continue;
    try {
      const abs = new URL(decodeEntities(src), base).toString();
      if (IMAGE_EXT.test(abs) && !NOISE.test(abs)) out.push(abs);
    } catch {
      // skip unresolvable src
    }
  }
  return out;
}

/**
 * Uniqlo adapter: their product pages sit behind bot protection, but the
 * image CDN is open and URLs derive from the product code in the URL, e.g.
 * https://www.uniqlo.com/jp/ja/products/E484830-000/00?colorDisplayCode=36
 *   -> https://image.uniqlo.com/UQ/ST3/AsianCommon/imagesgoods/484830/item/goods_36_484830_3x4.jpg
 * We emit several candidate patterns; the client keeps only ones that load.
 */
function uniqloCandidates(url: URL): string[] {
  if (!/(^|\.)uniqlo\.com$/.test(url.hostname)) return [];
  const m = url.pathname.match(/\/products\/E?(\d{6})-/i);
  if (!m) return [];
  const id = m[1];
  const color = url.searchParams.get("colorDisplayCode");
  const base = `https://image.uniqlo.com/UQ/ST3/AsianCommon/imagesgoods/${id}`;
  const out: string[] = [];
  const colors = color ? [color] : ["00", "01", "03", "08", "09", "30", "31", "32", "34", "36", "56", "57", "66", "69"];
  for (const c of colors) {
    out.push(`${base}/item/goods_${c}_${id}_3x4.jpg`);
    out.push(`${base}/item/goods_${c}_${id}.jpg`);
  }
  for (let i = 1; i <= 6; i++) {
    out.push(`${base}/sub/goods_${id}_sub${i}_3x4.jpg`);
    out.push(`${base}/sub/goods_${id}_sub${i}.jpg`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  if (!isAllowedUrl(raw)) {
    return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
  }
  const url = new URL(raw);

  let html = "";
  let fetchError: string | null = null;
  try {
    const res = await fetch(raw, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      html = (await res.text()).slice(0, 3_000_000);
    } else {
      fetchError = `The shop responded with status ${res.status}`;
    }
  } catch {
    fetchError = "Couldn't reach the shop page";
  }

  const images: string[] = [];
  const seen = new Set<string>();
  const push = (u: string | undefined | null) => {
    if (!u) return;
    try {
      const abs = new URL(u, url).toString();
      if (!seen.has(abs) && !NOISE.test(abs)) {
        seen.add(abs);
        images.push(abs);
      }
    } catch {
      // skip
    }
  };

  // Site adapters go first: they work even when the HTML is bot-blocked.
  uniqloCandidates(url).forEach(push);

  let title: string | null = null;
  let brand: string | null = null;
  let color: string | null = null;
  let material: string | null = null;
  let siteName: string | null = null;

  if (html) {
    const ld = parseJsonLd(html);
    const meta = parseMeta(html);
    ld?.images.forEach(push);
    meta.get("og:image")?.forEach(push);
    meta.get("og:image:secure_url")?.forEach(push);
    meta.get("twitter:image")?.forEach(push);
    parseImgTags(html, url).slice(0, 20).forEach(push);

    title =
      ld?.name ??
      meta.get("og:title")?.[0] ??
      decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "") ??
      null;
    brand = ld?.brand ?? null;
    color = ld?.color ?? meta.get("product:color")?.[0] ?? null;
    material = ld?.material ?? findComposition(html);
    siteName = meta.get("og:site_name")?.[0] ?? null;
  }

  if (images.length === 0) {
    return NextResponse.json(
      { error: fetchError ?? "No product images found on that page" },
      { status: 422 }
    );
  }

  const result: ScrapedProduct = {
    title: title || null,
    brand,
    color,
    material,
    siteName: siteName ?? url.hostname.replace(/^www\./, ""),
    images: images.slice(0, 24),
  };
  return NextResponse.json(result);
}
