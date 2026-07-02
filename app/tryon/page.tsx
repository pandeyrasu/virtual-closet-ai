"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import {
  deleteTryonPhoto,
  getItems,
  getTryonPhotos,
  newId,
  saveTryonPhoto,
} from "@/lib/db";
import type { ClothingItem, TryonPhoto } from "@/lib/types";
import { useBlobUrl } from "@/lib/useBlobUrl";

function PhotoCard({
  photo,
  items,
  onDelete,
}: {
  photo: TryonPhoto;
  items: ClothingItem[];
  onDelete: () => void;
}) {
  const url = useBlobUrl(photo.image);
  const worn = items.filter((i) => photo.itemIds.includes(i.id));
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[3/4] bg-ink/5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Try-on" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-1">
          {worn.map((i) => (
            <span key={i.id} className="chip">
              {i.name}
            </span>
          ))}
          {worn.length === 0 && (
            <span className="text-xs text-ink/50">No items tagged</span>
          )}
        </div>
        {photo.note && <p className="mt-1 text-xs text-ink/60">{photo.note}</p>}
        <button
          className="mt-2 text-xs text-ink/50 hover:text-red-600"
          onClick={onDelete}
        >
          Delete photo
        </button>
      </div>
    </div>
  );
}

export default function TryonPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [photos, setPhotos] = useState<TryonPhoto[]>([]);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftItemIds, setDraftItemIds] = useState<Set<string>>(new Set());
  const [draftNote, setDraftNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const draftUrl = useBlobUrl(draftFile);

  const refresh = useCallback(async () => {
    setItems(await getItems());
    setPhotos(await getTryonPhotos());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Paste support: Ctrl/Cmd+V a copied photo to start a new try-on entry.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])]
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .find((f): f is File => Boolean(f));
      if (file) {
        e.preventDefault();
        setDraftFile((prev) => prev ?? file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function toggleDraftItem(id: string) {
    setDraftItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveDraft() {
    if (!draftFile) return;
    await saveTryonPhoto({
      id: newId(),
      image: draftFile,
      itemIds: [...draftItemIds],
      note: draftNote.trim(),
      createdAt: Date.now(),
    });
    setDraftFile(null);
    setDraftItemIds(new Set());
    setDraftNote("");
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Virtual try-on photos</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/60">
          Upload photos of yourself wearing your clothes and tag which items
          you have on. When the app suggests an outfit, it shows the photo of
          you that best matches — real fit, real proportions, zero cost.
        </p>
      </div>

      {!draftFile ? (
        <div
          className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center hover:bg-ink/5"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f?.type.startsWith("image/")) setDraftFile(f);
          }}
        >
          <span className="text-3xl">🪞</span>
          <p className="font-medium">Add a photo of yourself</p>
          <p className="text-sm text-ink/60">
            Wearing any combination of your closet items — click, drop, or
            paste (Ctrl/Cmd+V)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setDraftFile(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="card flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full max-w-56 shrink-0 overflow-hidden rounded-xl bg-ink/5">
              {draftUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draftUrl} alt="" className="w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="mb-2 font-medium">
                Which items are you wearing in this photo?
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-ink/50">
                  Add some clothes to your closet first, then tag them here.
                </p>
              ) : (
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      selected={draftItemIds.has(item.id)}
                      onClick={() => toggleDraftItem(item.id)}
                    />
                  ))}
                </div>
              )}
              <input
                className="input mt-3 w-full"
                placeholder="Optional note (e.g. “date night look”)"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setDraftFile(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => void saveDraft()}
              disabled={draftItemIds.size === 0}
            >
              Save try-on photo
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            items={items}
            onDelete={() => {
              if (confirm("Delete this try-on photo?"))
                void deleteTryonPhoto(p.id).then(refresh);
            }}
          />
        ))}
      </div>
    </div>
  );
}
