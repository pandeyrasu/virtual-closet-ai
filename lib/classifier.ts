"use client";

import { TAXONOMY, subcategoryInfo, type SubcategoryInfo } from "./taxonomy";

export interface ClassificationResult {
  info: SubcategoryInfo;
  confidence: number;
}

export type ClassifierStatus = "idle" | "loading" | "ready" | "error";

type ZeroShotPipeline = (
  image: string,
  labels: string[],
  options?: { hypothesis_template?: string }
) => Promise<Array<{ label: string; score: number }>>;

let pipelinePromise: Promise<ZeroShotPipeline> | null = null;
const statusListeners = new Set<(s: ClassifierStatus) => void>();
let currentStatus: ClassifierStatus = "idle";

function setStatus(s: ClassifierStatus) {
  currentStatus = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getClassifierStatus() {
  return currentStatus;
}

export function onClassifierStatus(fn: (s: ClassifierStatus) => void) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

/**
 * Lazily load the CLIP zero-shot image classification pipeline.
 * The model (~90 MB quantized) is downloaded once from the Hugging Face CDN
 * and cached by the browser — free, no API key, runs entirely client-side.
 */
async function getPipeline(): Promise<ZeroShotPipeline> {
  if (!pipelinePromise) {
    setStatus("loading");
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false;
      const pipe = await pipeline(
        "zero-shot-image-classification",
        "Xenova/clip-vit-base-patch32"
      );
      setStatus("ready");
      return pipe as unknown as ZeroShotPipeline;
    })();
    pipelinePromise.catch(() => {
      setStatus("error");
      pipelinePromise = null;
    });
  }
  return pipelinePromise;
}

/** Kick off the model download early (e.g. when the upload page mounts). */
export function warmUpClassifier() {
  getPipeline().catch(() => {});
}

export async function classifyClothing(
  imageBlob: Blob
): Promise<ClassificationResult> {
  const pipe = await getPipeline();
  const url = URL.createObjectURL(imageBlob);
  try {
    const labels = TAXONOMY.map((t) => t.label);
    const results = await pipe(url, labels, {
      hypothesis_template: "a photo of a {}",
    });
    const best = results[0];
    const info = subcategoryInfo(best.label) ?? TAXONOMY[0];
    return { info, confidence: best.score };
  } finally {
    URL.revokeObjectURL(url);
  }
}
