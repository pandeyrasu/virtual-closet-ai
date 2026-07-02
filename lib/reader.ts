/**
 * Fallback content acquisition through Jina's free reader
 * (https://r.jina.ai/<url>): it renders the page in a real browser, which
 * gets past bot walls and client-side rendering that block a plain fetch.
 * Keyless usage is free (rate-limited); we only call it when the direct
 * fetch failed or produced no usable product data.
 */

export const READER_PREFIX =
  process.env.READER_PREFIX ?? "https://r.jina.ai/";

export async function fetchViaReader(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${READER_PREFIX}${url}`, {
      // ask for rendered HTML so the normal extractors (JSON-LD, og:) work;
      // keyless requests may return markdown instead, which we also parse
      headers: { "x-respond-with": "html" },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 3_000_000);
  } catch {
    return null;
  }
}

export function looksLikeHtml(content: string): boolean {
  return /<\s*(?:html|head|body|meta|div|img)[\s>]/i.test(content);
}

/** Title line of Jina's markdown output ("Title: ..."). */
export function markdownTitle(md: string): string | null {
  return md.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? null;
}

/** Image URLs from markdown: ![alt](url) plus bare image links. */
export function markdownImages(md: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    const clean = u.split(/[)\s]/)[0];
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  };
  for (const m of md.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    push(m[1]);
  }
  for (const m of md.matchAll(
    /(https?:\/\/[^\s"'<>)]+\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>)]*)?)/gi
  )) {
    push(m[1]);
  }
  return out;
}
