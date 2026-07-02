"use client";

import { useState } from "react";
import type { ScrapedProduct } from "@/lib/scrape-shared";

function proxied(url: string): string {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

/**
 * Paste a product link from an online shop; we extract the product's name
 * and images server-side (JSON-LD / OpenGraph / site adapters), then the
 * user picks exactly one image to import into the closet.
 */
export function ProductLinkImport({
  onPick,
}: {
  onPick: (file: File, suggestedName: string | null) => void;
}) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapedProduct | null>(null);
  const [dead, setDead] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  async function handleFetch() {
    const url = link.trim();
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(null);
    setDead(new Set());
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that page");
      setResult(data as ScrapedProduct);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't read that page — you can still save the image manually and upload it above."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!selected || !result) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(proxied(selected));
      if (!res.ok) throw new Error("Couldn't download that image");
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const file = new File([blob], `product.${ext}`, { type: blob.type });
      onPick(file, result.title);
      setResult(null);
      setLink("");
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const visibleImages = result?.images.filter((u) => !dead.has(u)) ?? [];

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <p className="font-medium">🔗 Import from a product link</p>
        <p className="text-sm text-ink/60">
          Paste a product page URL (Uniqlo, Zara, ASOS…) — we’ll pull the
          product name and photos so you can pick one.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleFetch();
        }}
      >
        <input
          className="input flex-1"
          type="url"
          placeholder="https://www.uniqlo.com/jp/ja/products/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={loading || !link.trim()}>
          {loading ? "Reading…" : "Fetch"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {result.title ? (
              <>
                Found <span className="font-medium">{result.title}</span>
                {result.siteName ? ` on ${result.siteName}` : ""}
              </>
            ) : (
              "Pick the product image:"
            )}
          </p>
          {visibleImages.length === 0 ? (
            <p className="text-sm text-ink/50">
              None of the page’s images could be loaded. Save the product
              image to your device and upload it above instead.
            </p>
          ) : (
            <div className="grid max-h-96 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
              {result.images.map((u) =>
                dead.has(u) ? null : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={u}
                    src={proxied(u)}
                    alt="Product option"
                    loading="lazy"
                    className={`aspect-square w-full cursor-pointer rounded-lg object-cover bg-ink/5 ${
                      selected === u ? "ring-2 ring-clay" : "hover:opacity-80"
                    }`}
                    onClick={() => setSelected(u)}
                    onError={() =>
                      setDead((prev) => new Set(prev).add(u))
                    }
                  />
                )
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setResult(null);
                setSelected(null);
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!selected || importing}
              onClick={() => void handleImport()}
            >
              {importing ? "Importing…" : "Use selected image"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
