import type { TryonPhoto } from "./types";

export interface TryonMatch {
  photo: TryonPhoto;
  /** how many of the outfit's items appear in the photo */
  overlap: number;
  /** Jaccard similarity between outfit items and photo items */
  similarity: number;
}

/**
 * Given a suggested outfit, find the user's own photo that best shows them
 * wearing (most of) those items. This is the free "virtual try-on": real
 * photos, real fit, zero inference cost.
 */
export function findBestTryonPhoto(
  outfitItemIds: string[],
  photos: TryonPhoto[]
): TryonMatch | null {
  const outfitSet = new Set(outfitItemIds);
  let best: TryonMatch | null = null;
  for (const photo of photos) {
    const photoSet = new Set(photo.itemIds);
    let overlap = 0;
    for (const id of outfitSet) if (photoSet.has(id)) overlap++;
    if (overlap === 0) continue;
    const unionSize = new Set([...outfitSet, ...photoSet]).size;
    const similarity = overlap / unionSize;
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && similarity > best.similarity)
    ) {
      best = { photo, overlap, similarity };
    }
  }
  return best;
}
