import { NextRequest, NextResponse } from "next/server";
import { BROWSER_HEADERS, isAllowedUrl } from "@/lib/scrape-shared";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Image proxy: shop CDNs don't send CORS headers, so the browser can't
 * fetch product images directly into a Blob. This route fetches the image
 * server-side (with a browser UA and same-origin referer) and streams it back.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  if (!isAllowedUrl(raw)) {
    return new NextResponse("Invalid or disallowed URL", { status: 400 });
  }
  let res: Response;
  try {
    res = await fetch(raw, {
      headers: { ...BROWSER_HEADERS, referer: new URL(raw).origin + "/" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }
  if (!res.ok) {
    return new NextResponse(`Upstream status ${res.status}`, { status: 502 });
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    return new NextResponse("Not an image", { status: 415 });
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return new NextResponse("Image too large", { status: 413 });
  }
  return new NextResponse(buf, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400",
    },
  });
}
