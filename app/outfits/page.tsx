"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteOutfit, getItems, getOutfits, getTryonPhotos } from "@/lib/db";
import { findBestTryonPhoto } from "@/lib/tryon";
import type { ClothingItem, Outfit, TryonPhoto } from "@/lib/types";
import { useBlobUrl } from "@/lib/useBlobUrl";

function Thumb({ item }: { item: ClothingItem }) {
  const url = useBlobUrl(item.image);
  return (
    <div className="h-16 w-16 overflow-hidden rounded-lg bg-ink/5" title={item.name}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.name} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function TryonThumb({ photo }: { photo: TryonPhoto }) {
  const url = useBlobUrl(photo.image);
  return (
    <div className="h-16 w-16 overflow-hidden rounded-lg bg-ink/5 ring-2 ring-clay" title="Your try-on photo">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Try-on" className="h-full w-full object-cover" />
      )}
    </div>
  );
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [photos, setPhotos] = useState<TryonPhoto[]>([]);

  const refresh = useCallback(async () => {
    setOutfits(await getOutfits());
    setItems(await getItems());
    setPhotos(await getTryonPhotos());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const itemById = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Saved outfits</h1>
        <p className="mt-1 text-sm text-ink/60">
          Outfits you saved from the Today page.
        </p>
      </div>

      {outfits.length === 0 ? (
        <p className="py-8 text-center text-ink/50">
          No saved outfits yet — save one from the Today page.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {outfits.map((o) => {
            const outfitItems = o.itemIds
              .map((id) => itemById.get(id))
              .filter((i): i is ClothingItem => Boolean(i));
            const match = findBestTryonPhoto(o.itemIds, photos);
            return (
              <div key={o.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{o.date}</p>
                  <button
                    className="text-xs text-ink/50 hover:text-red-600"
                    onClick={() => {
                      if (confirm("Delete this saved outfit?"))
                        void deleteOutfit(o.id).then(refresh);
                    }}
                  >
                    Delete
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {outfitItems.map((i) => (
                    <Thumb key={i.id} item={i} />
                  ))}
                  {match && <TryonThumb photo={match.photo} />}
                </div>
                {o.reason && (
                  <p className="text-xs text-ink/50">{o.reason}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
