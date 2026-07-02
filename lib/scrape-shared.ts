export interface ScrapedProduct {
  title: string | null;
  brand: string | null;
  /** color name as declared by the shop (JSON-LD `color`), if any */
  color: string | null;
  /** fabric composition, e.g. "100% cotton" or "65% polyester, 35% cotton" */
  material: string | null;
  siteName: string | null;
  /** candidate product image URLs, best guesses first (may include dead links — the client only shows ones that load) */
  images: string[];
}

/**
 * Basic SSRF guard for the scrape/proxy routes: only plain http(s) to
 * public-looking hosts. Set ALLOW_LOCAL_SCRAPE=1 in dev to test against
 * localhost fixtures.
 */
export function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (process.env.ALLOW_LOCAL_SCRAPE === "1") return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.startsWith("[")
  ) {
    return false;
  }
  return true;
}

export const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en,ja;q=0.8",
};
