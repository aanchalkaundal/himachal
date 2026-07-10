"use client";

import type { AnchorCharacter } from "./types";
import { getAnchorEntry } from "./index";

/**
 * Anchor asset cache (editor runtime): loads a character on demand, caches it,
 * and unloads anchors that are no longer active. This implements the Phase 3
 * performance mandate — "load only the active anchor, lazy load, cache, unload
 * unused, no duplicate loading" — for the editor/preview lifecycle. The video
 * composition uses the eager registry component for deterministic rendering.
 */
const cache = new Map<string, AnchorCharacter>();
const inflight = new Map<string, Promise<AnchorCharacter | null>>();

export async function ensureAnchorLoaded(id: string): Promise<AnchorCharacter | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const pending = inflight.get(id);
  if (pending) return pending; // de-dupe concurrent loads
  const entry = getAnchorEntry(id);
  if (!entry) return null;
  const p = entry
    .load()
    .then((c) => {
      cache.set(id, c);
      inflight.delete(id);
      return c;
    })
    .catch(() => {
      inflight.delete(id);
      return null;
    });
  inflight.set(id, p);
  return p;
}

export function getCachedAnchor(id: string): AnchorCharacter | undefined {
  return cache.get(id);
}

/** Drop any cached anchors not in the active set (free memory). */
export function unloadUnusedAnchors(activeIds: Set<string>): void {
  for (const id of [...cache.keys()]) {
    if (!activeIds.has(id)) cache.delete(id);
  }
}

export function loadedAnchorCount(): number {
  return cache.size;
}
