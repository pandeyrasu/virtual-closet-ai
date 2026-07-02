"use client";

import { useEffect, useRef, useState } from "react";
import {
  classifyClothing,
  getClassifierStatus,
  onClassifierStatus,
  warmUpClassifier,
  type ClassifierStatus,
} from "@/lib/classifier";
import {
  colorFromText,
  extractDominantColors,
  nearestColorName,
} from "@/lib/colors";
import { newId, saveItem } from "@/lib/db";
import {
  matchTaxonomyFromText,
  TAXONOMY,
  subcategoryInfo,
} from "@/lib/taxonomy";
import type { ClothingItem } from "@/lib/types";
import { useBlobUrl } from "@/lib/useBlobUrl";
import { ProductLinkImport } from "./ProductLinkImport";

interface PendingItem {
  tempId: string;
  file: File;
  /** product title from a link import; overrides the auto-generated name */
  nameOverride?: string | null;
  /** color as declared by the shop (link imports) */
  colorHint?: string | null;
  /** fabric composition from the shop page (link imports) */
  material?: string | null;
  /** how the category was decided, for the review caption */
  source?: "ai" | "title";
  status: "queued" | "classifying" | "review" | "saved" | "error";
  draft?: ClothingItem;
  error?: string;
}

function DraftRow({
  pending,
  onChange,
  onSave,
}: {
  pending: PendingItem;
  onChange: (draft: ClothingItem) => void;
  onSave: () => void;
}) {
  const url = useBlobUrl(pending.file);
  const draft = pending.draft;
  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink/5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {pending.status === "queued" && (
          <p className="text-sm text-ink/60">Waiting…</p>
        )}
        {pending.status === "classifying" && (
          <p className="text-sm text-ink/60">
            <span className="mr-2 inline-block animate-spin">◌</span>
            Analyzing with on-device AI…
          </p>
        )}
        {pending.status === "error" && (
          <p className="text-sm text-red-600">{pending.error}</p>
        )}
        {pending.status === "saved" && draft && (
          <p className="text-sm text-sage">✓ Saved “{draft.name}” to your closet</p>
        )}
        {pending.status === "review" && draft && (
          <div className="flex flex-col gap-2">
            {pending.error && (
              <p className="text-xs text-clay">{pending.error}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input flex-1"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
              />
              <select
                className="input"
                value={draft.subcategory}
                onChange={(e) => {
                  const info = subcategoryInfo(e.target.value);
                  if (!info) return;
                  onChange({
                    ...draft,
                    subcategory: info.label,
                    category: info.category,
                    warmth: info.warmth,
                    seasons: info.seasons,
                    occasions: info.occasions,
                    confidence: 0,
                  });
                }}
              >
                {TAXONOMY.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label} ({t.category})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-ink/50">
                {pending.source === "title"
                  ? `from product title · ${draft.colorName}`
                  : draft.confidence > 0
                    ? `AI guess · ${Math.round(draft.confidence * 100)}% confident · ${draft.colorName}`
                    : `manually set · ${draft.colorName}`}
                {draft.material ? ` · ${draft.material}` : ""}
              </p>
              <button className="btn-primary" onClick={onSave}>
                Add to closet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function UploadItems({ onSaved }: { onSaved: () => void }) {
  const [pendings, setPendings] = useState<PendingItem[]>([]);
  const [modelStatus, setModelStatus] = useState<ClassifierStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const processing = useRef(false);

  useEffect(() => {
    setModelStatus(getClassifierStatus());
    const off = onClassifierStatus(setModelStatus);
    warmUpClassifier();
    return () => {
      off();
    };
  }, []);

  const update = (tempId: string, patch: Partial<PendingItem>) =>
    setPendings((ps) =>
      ps.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p))
    );

  async function processQueue(queue: PendingItem[]) {
    if (processing.current) return;
    processing.current = true;
    for (const p of queue) {
      update(p.tempId, { status: "classifying" });
      let pixelColors = ["#888888"];
      try {
        pixelColors = await extractDominantColors(p.file);
      } catch {
        // keep fallback color
      }

      // Shop metadata beats pixel/AI guesses when available: the declared
      // color field first, then color words in the product title.
      const textColor =
        (p.colorHint && colorFromText(p.colorHint)) ||
        (p.nameOverride && colorFromText(p.nameOverride)) ||
        null;
      const colorName = textColor?.name ?? nearestColorName(pixelColors[0]);
      const colors = textColor
        ? [textColor.hex, ...pixelColors.filter((c) => c !== textColor.hex)]
        : pixelColors;

      // Same for the category: a product title like "Sleeveless T-Shirt"
      // is more reliable than image classification.
      const titleInfo = p.nameOverride
        ? matchTaxonomyFromText(p.nameOverride)
        : null;
      let info = titleInfo ?? TAXONOMY[0];
      let confidence = 0;
      let source: "ai" | "title" = titleInfo ? "title" : "ai";
      let aiFailed = false;
      if (!titleInfo) {
        try {
          const result = await classifyClothing(p.file);
          info = result.info;
          confidence = result.confidence;
        } catch {
          // Model unavailable (offline / download blocked): fall back to a
          // manual draft so the item can still be categorized by hand.
          aiFailed = true;
        }
      }

      const draft: ClothingItem = {
        id: newId(),
        name: p.nameOverride?.trim() || `${colorName} ${info.label}`,
        category: info.category,
        subcategory: info.label,
        colors,
        colorName,
        warmth: info.warmth,
        seasons: info.seasons,
        occasions: info.occasions,
        confidence,
        material: p.material?.trim() || null,
        image: p.file,
        favorite: false,
        wearCount: 0,
        lastWorn: null,
        createdAt: Date.now(),
      };
      update(p.tempId, {
        status: "review",
        draft,
        source,
        error: aiFailed
          ? "AI is unavailable right now — please set the category manually."
          : undefined,
      });
    }
    processing.current = false;
  }

  function addFiles(
    entries: Array<{
      file: File;
      nameOverride?: string | null;
      colorHint?: string | null;
      material?: string | null;
    }>
  ) {
    const queue: PendingItem[] = entries
      .filter((e) => e.file.type.startsWith("image/"))
      .map((e) => ({
        tempId: newId(),
        file: e.file,
        nameOverride: e.nameOverride,
        colorHint: e.colorHint,
        material: e.material,
        status: "queued" as const,
      }));
    if (queue.length === 0) return;
    setPendings((ps) => [...queue, ...ps]);
    void processQueue(queue);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    addFiles([...files].map((file) => ({ file })));
  }

  async function handleSave(p: PendingItem) {
    if (!p.draft) return;
    await saveItem(p.draft);
    update(p.tempId, { status: "saved" });
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center hover:bg-ink/5"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span className="text-3xl">📷</span>
        <p className="font-medium">Add clothes</p>
        <p className="max-w-sm text-sm text-ink/60">
          Drop product photos or your own pictures here. The AI categorizes
          them automatically — right on your device, for free.
        </p>
        {modelStatus === "loading" && (
          <p className="text-xs text-clay">
            Downloading the free AI model (~90 MB, one time)…
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <ProductLinkImport
        onPick={(file, meta) =>
          addFiles([
            {
              file,
              nameOverride: meta.title,
              colorHint: meta.color,
              material: meta.material,
            },
          ])
        }
      />
      {pendings.map((p) => (
        <DraftRow
          key={p.tempId}
          pending={p}
          onChange={(draft) => update(p.tempId, { draft })}
          onSave={() => void handleSave(p)}
        />
      ))}
    </div>
  );
}
