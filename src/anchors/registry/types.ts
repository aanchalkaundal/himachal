import type React from "react";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** A character component is a pure renderer of a per-frame pose. */
export type AnchorCharacter = React.FC<{ state: AnchorRenderState }>;

/**
 * A registry entry pairs light metadata (always loaded) with a lazy loader for
 * the (heavier) character module — so only anchors actually used are pulled in.
 * `component` is the eagerly-available renderer used inside the video
 * composition (deterministic, no Suspense); `load` is the code-split path used
 * by the editor UI to demonstrate lazy-load + cache.
 */
export interface AnchorRegistryEntry {
  metadata: AnchorMetadata;
  component: AnchorCharacter;
  load: () => Promise<AnchorCharacter>;
}
