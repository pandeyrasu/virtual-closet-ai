"use client";

import { useCallback, useEffect, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { UploadItems } from "@/components/UploadItems";
import { deleteItem, getItems, saveItem } from "@/lib/db";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type ClothingItem,
} from "@/lib/types";

export default function ClosetPage() {
  const [items, setItems] = useState<ClothingItem[] | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");

  const refresh = useCallback(async () => {
    setItems(await getItems());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible =
    items?.filter((i) => filter === "all" || i.category === filter) ?? [];

  async function toggleFavorite(item: ClothingItem) {
    await saveItem({ ...item, favorite: !item.favorite });
    await refresh();
  }

  async function remove(item: ClothingItem) {
    if (!confirm(`Remove “${item.name}” from your closet?`)) return;
    await deleteItem(item.id);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">My closet</h1>

      <UploadItems onSaved={() => void refresh()} />

      <div className="flex flex-wrap gap-2">
        <button
          className={`chip ${filter === "all" ? "!bg-ink !text-cream" : "hover:bg-ink/5"}`}
          onClick={() => setFilter("all")}
        >
          All ({items?.length ?? 0})
        </button>
        {ALL_CATEGORIES.map((c) => {
          const n = items?.filter((i) => i.category === c).length ?? 0;
          if (n === 0) return null;
          return (
            <button
              key={c}
              className={`chip ${filter === c ? "!bg-ink !text-cream" : "hover:bg-ink/5"}`}
              onClick={() => setFilter(c)}
            >
              {CATEGORY_LABELS[c]} ({n})
            </button>
          );
        })}
      </div>

      {items !== null && items.length === 0 ? (
        <p className="py-8 text-center text-ink/50">
          Your closet is empty — add some photos above to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              footer={
                <div className="mt-2 flex items-center justify-between text-xs text-ink/50">
                  <span>worn {item.wearCount}×</span>
                  <span className="flex gap-2">
                    <button
                      title="Favorite"
                      onClick={() => void toggleFavorite(item)}
                      className={item.favorite ? "text-clay" : "hover:text-clay"}
                    >
                      ♥
                    </button>
                    <button
                      title="Delete"
                      onClick={() => void remove(item)}
                      className="hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
