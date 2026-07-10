/**
 * Reusable anchor entry/exit transitions, scene-scoped and independent: an
 * anchor animates in at the start of each scene it appears in and out at the
 * end, so no scene depends on another.
 */
import { interpolate } from "remotion";
import type { AnchorTransition } from "@/anchors/types";

export interface EnterExitStyle {
  opacity: number;
  transform: string;
}

const DUR = (fps: number) => Math.max(1, Math.round(fps * 0.5));

function offsetFor(t: AnchorTransition, p: number, dir: 1 | -1): { tx: number; ty: number; scale: number; fade: number } {
  // p: 0 = fully hidden/offset, 1 = settled
  const inv = 1 - p;
  switch (t) {
    case "fade":
      return { tx: 0, ty: 0, scale: 1, fade: p };
    case "slide-up":
      return { tx: 0, ty: inv * 60 * dir, scale: 1, fade: p };
    case "slide-left":
      return { tx: inv * 80 * dir, ty: 0, scale: 1, fade: p };
    case "slide-right":
      return { tx: -inv * 80 * dir, ty: 0, scale: 1, fade: p };
    case "scale":
      return { tx: 0, ty: 0, scale: interpolate(p, [0, 1], [0.8, 1]), fade: p };
    case "none":
    default:
      return { tx: 0, ty: 0, scale: 1, fade: 1 };
  }
}

/** Combined entry+exit style for a given local frame within a scene. */
export function getEnterExitStyle(
  entry: AnchorTransition,
  exit: AnchorTransition,
  localFrame: number,
  sceneDuration: number,
  fps: number,
): EnterExitStyle {
  const d = DUR(fps);
  const enterP = entry === "none" ? 1 : interpolate(localFrame, [0, d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitP = exit === "none" ? 1 : interpolate(localFrame, [sceneDuration - d, sceneDuration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const e = offsetFor(entry, enterP, 1);
  const x = offsetFor(exit, exitP, 1);

  return {
    opacity: Math.min(e.fade, x.fade),
    transform: `translate(${e.tx + x.tx}px, ${e.ty + x.ty}px) scale(${e.scale * x.scale})`,
  };
}
