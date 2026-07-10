import type { AspectRatio, Fps } from "@/types/project";

/** Kinds of scene the timeline engine can emit. Extend freely — the renderer
 * resolves each kind through the scene registry, so new kinds don't touch the
 * render pipeline. */
export type SceneKind = "intro" | "headline" | "body" | "outro";

export type TransitionType = "fade" | "slide" | "wipe" | "none";

/** A single scene placed on the timeline. */
export interface TimelineScene {
  id: string;
  kind: SceneKind;
  /** 0-based position in the sequence. */
  index: number;
  durationInFrames: number;
  /** Absolute start frame on the master timeline (accounts for transition overlaps). */
  startFrame: number;
  /** Absolute end frame (exclusive). */
  endFrame: number;
  /** Optional per-scene payload (e.g. a body paragraph). */
  data?: { paragraph?: string; paragraphIndex?: number; paragraphCount?: number };
}

/** Transition inserted between scene[i] and scene[i+1]. */
export interface TimelineTransition {
  type: TransitionType;
  durationInFrames: number;
}

/** Fully-resolved timeline consumed by the composition and the renderer. */
export interface Timeline {
  fps: Fps;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  scenes: TimelineScene[];
  /** transitions[i] sits between scenes[i] and scenes[i+1]; length = scenes.length - 1. */
  transitions: TimelineTransition[];
  totalDurationInFrames: number;
}
