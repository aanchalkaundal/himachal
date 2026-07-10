/**
 * Anchor Engine — domain types.
 *
 * These types are the contract between anchor *packages* (self-contained folders
 * under src/anchors/<name>/) and the rest of the app. The renderer, editor and
 * timeline depend ONLY on these types + the registry — never on a specific
 * anchor — so adding an anchor is "new folder + register", nothing else.
 *
 * No AI: characters are deterministic parametric SVG rigs and every animation is
 * a pure function of the frame.
 */
import type { TemplateId } from "@/types/project";

export type AnchorCategory = "regional" | "national" | "business" | "sports" | "weather" | "digital";

/** Placement presets (plus a free "custom" x/y). */
export type AnchorPositionId =
  | "bottom-left"
  | "bottom-right"
  | "center-left"
  | "center-right"
  | "behind-desk"
  | "full-body"
  | "custom";

/** Compositing layers, ordered back → front. */
export type AnchorLayerId = "background" | "desk" | "middle" | "front" | "overlay";

export const LAYER_ORDER: AnchorLayerId[] = ["background", "desk", "middle", "front", "overlay"];

/** Reusable animation presets. Talking-family presets loop the mouth. */
export type AnchorAnimationId =
  | "idle"
  | "talking"
  | "blink"
  | "smile"
  | "head-nod"
  | "hand-gesture"
  | "wave"
  | "point"
  | "reading"
  | "listening"
  | "serious"
  | "breaking"
  | "intro"
  | "outro";

/** Entry/exit transitions for an anchor within a scene. */
export type AnchorTransition = "none" | "fade" | "slide-up" | "slide-left" | "slide-right" | "scale";

/** Palette that differentiates otherwise-shared rigs. */
export interface ColorProfile {
  skin: string;
  hair: string;
  outfitPrimary: string;
  outfitSecondary: string;
  accent: string;
}

/** Static description of an anchor package — light, always eager-loaded. */
export interface AnchorMetadata {
  id: string;
  name: string;
  category: AnchorCategory;
  description: string;
  /** Templates this anchor is styled to suit ("all" = universal). */
  themeCompatibility: TemplateId[] | "all";
  /** Studios (future) this anchor is compatible with ("all" = independent). */
  supportedStudios: string[] | "all";
  defaultPosition: AnchorPositionId;
  defaultScale: number;
  defaultLayer: AnchorLayerId;
  animationPresets: AnchorAnimationId[];
  colorProfile: ColorProfile;
  /** Accent color used for the registry thumbnail chip. */
  thumbnailColor: string;
}

/** Per-frame expression/pose the character rig renders. Pure data — this is the
 * seam a future phoneme-accurate voice system plugs into (replace the resolver,
 * keep the rig). */
export interface AnchorRenderState {
  /** 0 = closed, 1 = fully open. */
  mouthOpen: number;
  /** 1 = eyes open, 0 = blink. */
  eyesOpen: number;
  /** -1..1 eyebrow raise. */
  browRaise: number;
  /** 0..1 smile. */
  smile: number;
  /** Right-arm angle in degrees (gesture/wave/point). */
  armAngle: number;
  /** Horizontal idle sway in px. */
  sway: number;
  /** Head nod offset in px. */
  nod: number;
}

/** Free custom placement as viewport percentages. */
export interface CustomPosition {
  x: number;
  y: number;
}

/**
 * A placed anchor in a project. Anchors are timeline objects: each is fully
 * self-describing and scene-independent — the composition renders it per scene
 * using these fields, with optional per-scene animation overrides.
 */
export interface AnchorInstance {
  instanceId: string;
  anchorId: string;
  enabled: boolean;
  visible: boolean;

  position: AnchorPositionId;
  customPosition: CustomPosition;
  scale: number;
  opacity: number;
  shadow: boolean;
  flip: boolean;
  layer: AnchorLayerId;

  entry: AnchorTransition;
  exit: AnchorTransition;
  /** Forced animation; when "auto" the renderer picks per scene kind. */
  animation: AnchorAnimationId | "auto";

  /** Scene indices this anchor appears in ("all" = every scene). */
  visibleScenes: "all" | number[];
  /** Optional per-scene-index animation override. */
  sceneAnimations: Record<number, AnchorAnimationId>;
}
