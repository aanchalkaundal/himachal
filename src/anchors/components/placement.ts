import type { CSSProperties } from "react";
import type { AnchorInstance } from "@/anchors/types";

/** Intrinsic aspect of the rig viewBox (300 × 480). */
const ASPECT = 300 / 480;

/** Height factor of composition height for each position family. */
function heightFactor(instance: AnchorInstance): number {
  switch (instance.position) {
    case "full-body":
      return 0.96;
    case "center-left":
    case "center-right":
      return 0.66;
    case "behind-desk":
      return 0.78;
    default:
      return 0.72;
  }
}

/**
 * Compute the absolute container style for an anchor given the composition size.
 * Pure geometry — no per-anchor knowledge — so any registered anchor places
 * identically.
 */
export function placementStyle(instance: AnchorInstance, compW: number, compH: number): CSSProperties {
  const h = compH * heightFactor(instance) * instance.scale;
  const w = h * ASPECT;
  const margin = compW * 0.04;

  const base: CSSProperties = { position: "absolute", height: h, width: w };

  switch (instance.position) {
    case "bottom-left":
      return { ...base, left: margin, bottom: 0 };
    case "bottom-right":
      return { ...base, right: margin, bottom: 0 };
    case "center-left":
      return { ...base, left: margin, top: (compH - h) / 2 };
    case "center-right":
      return { ...base, right: margin, top: (compH - h) / 2 };
    case "behind-desk":
      return { ...base, left: (compW - w) / 2, bottom: 0 };
    case "full-body":
      return { ...base, left: (compW - w) / 2, bottom: 0 };
    case "custom":
      return {
        ...base,
        left: (instance.customPosition.x / 100) * compW - w / 2,
        top: (instance.customPosition.y / 100) * compH - h / 2,
      };
    default:
      return { ...base, right: margin, bottom: 0 };
  }
}
