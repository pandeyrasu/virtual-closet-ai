"use client";

import { useBlobUrl } from "@/lib/useBlobUrl";
import type { ClothingItem } from "@/lib/types";

export function ItemCard({
  item,
  onClick,
  selected,
  footer,
}: {
  item: ClothingItem;
  onClick?: () => void;
  selected?: boolean;
  footer?: React.ReactNode;
}) {
  const url = useBlobUrl(item.image);
  return (
    <div
      onClick={onClick}
      className={`card overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md" : ""} ${
        selected ? "ring-2 ring-clay" : ""
      }`}
    >
      <div className="relative aspect-square bg-ink/5">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        )}
        {item.favorite && (
          <span className="absolute right-2 top-2 text-lg drop-shadow">♥</span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {item.colors.slice(0, 3).map((c) => (
            <span
              key={c}
              className="h-3 w-3 rounded-full border border-ink/10"
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="text-xs text-ink/50">{item.subcategory}</span>
        </div>
        {footer}
      </div>
    </div>
  );
}
