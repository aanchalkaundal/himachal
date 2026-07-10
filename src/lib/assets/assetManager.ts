/**
 * Centralized asset manager.
 *
 * Uploads flow through here so identical files are stored exactly once
 * (content-hash dedup) and reused everywhere they're referenced — the logo used
 * as both branding logo and intro logo costs one entry, one decode. The manager
 * is UI-agnostic; the editor registers assets and the renderer benefits because
 * Remotion caches identical data URLs across the render.
 */

export type AssetKind = "image" | "video" | "audio" | "logo";

export interface AssetEntry {
  id: string;
  kind: AssetKind;
  /** Data URL — the canonical, reusable representation. */
  dataUrl: string;
  name: string;
  /** Approximate decoded byte size. */
  bytes: number;
  /** How many project fields currently reference this asset. */
  refCount: number;
}

/** Fast, deterministic 32-bit FNV-1a hash of a string. */
function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Rough byte size of a base64 data URL payload. */
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

class AssetManager {
  private byHash = new Map<string, AssetEntry>();
  private listeners = new Set<() => void>();

  /** Register (or reuse) an asset; returns its data URL (the reusable ref). */
  register(kind: AssetKind, dataUrl: string, name = "asset"): string {
    const key = hash(dataUrl);
    const existing = this.byHash.get(key);
    if (existing) {
      existing.refCount += 1;
    } else {
      this.byHash.set(key, {
        id: `asset_${key}`,
        kind,
        dataUrl,
        name,
        bytes: dataUrlBytes(dataUrl),
        refCount: 1,
      });
    }
    this.emit();
    return dataUrl;
  }

  /** Drop a reference; frees the entry when no field uses it anymore. */
  release(dataUrl?: string): void {
    if (!dataUrl) return;
    const key = hash(dataUrl);
    const entry = this.byHash.get(key);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) this.byHash.delete(key);
    this.emit();
  }

  list(): AssetEntry[] {
    return [...this.byHash.values()];
  }

  stats() {
    const entries = this.list();
    return {
      count: entries.length,
      totalBytes: entries.reduce((s, e) => s + e.bytes, 0),
      totalRefs: entries.reduce((s, e) => s + e.refCount, 0),
    };
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

/** App-wide singleton. */
export const assetManager = new AssetManager();
