import type { AnchorRegistryEntry, AnchorCharacter } from "./types";
import type { AnchorMetadata } from "@/anchors/types";

// Eager metadata + character imports. Metadata is tiny; characters are shared,
// stateless SVG rigs. `load` provides the code-split path for editor lazy-load.
import { metadata as mHimachali, Character as CHimachali } from "@/anchors/male-himachali";
import { metadata as fHimachali, Character as CFHimachali } from "@/anchors/female-himachali";
import { metadata as mNational, Character as CMNational } from "@/anchors/male-national";
import { metadata as fNational, Character as CFNational } from "@/anchors/female-national";
import { metadata as business, Character as CBusiness } from "@/anchors/business";
import { metadata as sports, Character as CSports } from "@/anchors/sports";
import { metadata as weather, Character as CWeather } from "@/anchors/weather";
import { metadata as youth, Character as CYouth } from "@/anchors/youth";

/**
 * THE ANCHOR REGISTRY.
 *
 * The editor, renderer and timeline resolve anchors exclusively through this
 * table — none of them names a specific anchor. To add an anchor: create its
 * folder (metadata + Character) and add ONE row here. Nothing else changes.
 */
const entry = (
  metadata: AnchorMetadata,
  component: AnchorCharacter,
  load: () => Promise<{ Character: AnchorCharacter }>,
): AnchorRegistryEntry => ({
  metadata,
  component,
  load: () => load().then((m) => m.Character),
});

export const ANCHOR_REGISTRY: AnchorRegistryEntry[] = [
  entry(mHimachali, CHimachali, () => import("@/anchors/male-himachali")),
  entry(fHimachali, CFHimachali, () => import("@/anchors/female-himachali")),
  entry(mNational, CMNational, () => import("@/anchors/male-national")),
  entry(fNational, CFNational, () => import("@/anchors/female-national")),
  entry(business, CBusiness, () => import("@/anchors/business")),
  entry(sports, CSports, () => import("@/anchors/sports")),
  entry(weather, CWeather, () => import("@/anchors/weather")),
  entry(youth, CYouth, () => import("@/anchors/youth")),
];

const BY_ID = new Map(ANCHOR_REGISTRY.map((e) => [e.metadata.id, e]));

export function getAnchorEntry(id: string): AnchorRegistryEntry | undefined {
  return BY_ID.get(id);
}

export function listAnchorMetadata(): AnchorMetadata[] {
  return ANCHOR_REGISTRY.map((e) => e.metadata);
}

export function listAnchorsByCategory(): Record<string, AnchorMetadata[]> {
  const out: Record<string, AnchorMetadata[]> = {};
  for (const e of ANCHOR_REGISTRY) {
    (out[e.metadata.category] ??= []).push(e.metadata);
  }
  return out;
}
