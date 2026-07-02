"use client";

import { useMemo, useState } from "react";
import type { OutfitSuggestion } from "@/lib/outfit-engine";
import { findBestTryonPhoto } from "@/lib/tryon";
import type { ClothingItem, TryonPhoto } from "@/lib/types";
import { useBlobUrl } from "@/lib/useBlobUrl";

function CollageTile({ item, wide }: { item: ClothingItem; wide?: boolean }) {
  const url = useBlobUrl(item.image);
  return (
    <div
      className={`overflow-hidden rounded-lg bg-ink/5 ${wide ? "col-span-2" : ""}`}
      title={item.name}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.name} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

/** "Paper doll" layout: top over bottom, side column for layers/shoes/extras. */
function OutfitCollage({ items }: { items: ClothingItem[] }) {
  const main = items.filter(
    (i) => i.category === "dress" || i.category === "top" || i.category === "bottom"
  );
  const rest = items.filter((i) => !main.includes(i));
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <div className="col-span-2 grid gap-1.5">
        {main.map((i) => (
          <CollageTile key={i.id} item={i} />
        ))}
      </div>
      <div className="grid content-start gap-1.5">
        {rest.map((i) => (
          <CollageTile key={i.id} item={i} />
        ))}
      </div>
    </div>
  );
}

function TryonView({ photo, overlap, total }: { photo: TryonPhoto; overlap: number; total: number }) {
  const url = useBlobUrl(photo.image);
  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-ink/5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="You wearing this outfit" className="max-h-96 w-full object-contain" />
        )}
      </div>
      <p className="mt-1.5 text-xs text-ink/50">
        Your photo — wearing {overlap} of {total} suggested item{total === 1 ? "" : "s"}
        {photo.note ? ` · ${photo.note}` : ""}
      </p>
    </div>
  );
}

export function OutfitCard({
  suggestion,
  tryonPhotos,
  onSave,
  onWear,
  saved,
}: {
  suggestion: OutfitSuggestion;
  tryonPhotos: TryonPhoto[];
  onSave?: () => void;
  onWear?: () => void;
  saved?: boolean;
}) {
  const [showTryon, setShowTryon] = useState(false);
  const match = useMemo(
    () =>
      findBestTryonPhoto(
        suggestion.items.map((i) => i.id),
        tryonPhotos
      ),
    [suggestion, tryonPhotos]
  );

  return (
    <div className="card p-4">
      {showTryon && match ? (
        <TryonView
          photo={match.photo}
          overlap={match.overlap}
          total={suggestion.items.length}
        />
      ) : (
        <OutfitCollage items={suggestion.items} />
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {suggestion.items.map((i) => (
          <li key={i.id} className="chip">
            <span
              className="mr-1.5 h-2.5 w-2.5 rounded-full border border-ink/10"
              style={{ backgroundColor: i.colors[0] }}
            />
            {i.name}
          </li>
        ))}
      </ul>

      <ul className="mt-3 space-y-1 text-sm text-ink/70">
        {suggestion.reasons.slice(0, 3).map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {match ? (
          <button
            className="btn-secondary"
            onClick={() => setShowTryon((v) => !v)}
          >
            🪞 {showTryon ? "Show items" : "Try it on"}
          </button>
        ) : (
          <span className="text-xs text-ink/50">
            No try-on photo yet — add one in the Try-on tab wearing these items.
          </span>
        )}
        {onWear && (
          <button className="btn-secondary" onClick={onWear}>
            ✓ Wearing this today
          </button>
        )}
        {onSave && (
          <button className="btn-primary" onClick={onSave} disabled={saved}>
            {saved ? "Saved" : "Save outfit"}
          </button>
        )}
      </div>
    </div>
  );
}
