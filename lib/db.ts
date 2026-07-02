"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ClothingItem, Outfit, TryonPhoto } from "./types";

interface ClosetDB extends DBSchema {
  items: { key: string; value: ClothingItem; indexes: { byCategory: string } };
  outfits: { key: string; value: Outfit; indexes: { byDate: string } };
  tryonPhotos: { key: string; value: TryonPhoto };
}

let dbPromise: Promise<IDBPDatabase<ClosetDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ClosetDB>("virtual-closet", 1, {
      upgrade(db) {
        const items = db.createObjectStore("items", { keyPath: "id" });
        items.createIndex("byCategory", "category");
        const outfits = db.createObjectStore("outfits", { keyPath: "id" });
        outfits.createIndex("byDate", "date");
        db.createObjectStore("tryonPhotos", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export function newId(): string {
  return crypto.randomUUID();
}

// ---- items ----
export async function saveItem(item: ClothingItem) {
  const db = await getDB();
  await db.put("items", item);
}

export async function getItems(): Promise<ClothingItem[]> {
  const db = await getDB();
  const items = await db.getAll("items");
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getItem(id: string): Promise<ClothingItem | undefined> {
  const db = await getDB();
  return db.get("items", id);
}

export async function deleteItem(id: string) {
  const db = await getDB();
  await db.delete("items", id);
}

// ---- outfits ----
export async function saveOutfit(outfit: Outfit) {
  const db = await getDB();
  await db.put("outfits", outfit);
}

export async function getOutfits(): Promise<Outfit[]> {
  const db = await getDB();
  const outfits = await db.getAll("outfits");
  return outfits.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteOutfit(id: string) {
  const db = await getDB();
  await db.delete("outfits", id);
}

// ---- try-on photos ----
export async function saveTryonPhoto(photo: TryonPhoto) {
  const db = await getDB();
  await db.put("tryonPhotos", photo);
}

export async function getTryonPhotos(): Promise<TryonPhoto[]> {
  const db = await getDB();
  const photos = await db.getAll("tryonPhotos");
  return photos.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteTryonPhoto(id: string) {
  const db = await getDB();
  await db.delete("tryonPhotos", id);
}
