/**
 * Deterministic anchor animation — the "no-AI" heart of the engine.
 *
 * `resolveAnchorState` maps (animation preset, local frame) → a pose. Every
 * anchor uses these same reusable presets, so animations are shared, not
 * per-character. Talking is a deterministic mouth loop driven purely by frame
 * position (narration duration), NOT lip-sync — see `talkMouth`. This function
 * is the single seam a future phoneme-accurate voice engine replaces without
 * touching rigs, renderer, or timeline.
 */
import type { AnchorAnimationId, AnchorRenderState } from "@/anchors/types";

const TAU = Math.PI * 2;

/** Presets whose mouth animates (deterministic talking loop). */
const TALKING: AnchorAnimationId[] = ["talking", "reading", "breaking", "intro"];

/** Deterministic pseudo-speech mouth openness (0..1) from a frame index. */
function talkMouth(frame: number): number {
  const a = Math.sin(frame * 0.9) * 0.5 + 0.5;
  const b = Math.sin(frame * 2.3 + 1.3) * 0.5 + 0.5;
  const v = a * 0.6 + b * 0.4;
  return v > 0.32 ? Math.min(1, v) : 0.06; // brief closes between "syllables"
}

/** Natural blink: a quick close roughly every 2.5s. */
function blink(frame: number, fps: number): number {
  const period = Math.max(1, Math.round(fps * 2.5));
  const phase = frame % period;
  const closeFrames = Math.max(2, Math.round(fps * 0.12));
  if (phase >= period - closeFrames) {
    const t = (phase - (period - closeFrames)) / closeFrames; // 0..1
    return Math.abs(Math.cos(t * Math.PI)); // 1→0→1
  }
  return 1;
}

/**
 * Resolve the full pose for a preset at a given local frame.
 * @param animation preset id
 * @param frame frame index local to the scene the anchor plays in
 * @param fps composition fps
 */
export function resolveAnchorState(animation: AnchorAnimationId, frame: number, fps: number): AnchorRenderState {
  // Baselines shared by every preset (breathing sway + natural blink).
  const sway = Math.sin((frame / fps) * TAU * 0.22) * 3;
  const eyesOpen = blink(frame, fps);

  const base: AnchorRenderState = {
    mouthOpen: 0,
    eyesOpen,
    browRaise: 0,
    smile: 0.1,
    armAngle: 0,
    sway,
    nod: 0,
  };

  const talk = talkMouth(frame);

  switch (animation) {
    case "idle":
      return base;
    case "talking":
    case "reading":
      return { ...base, mouthOpen: talk, nod: Math.sin((frame / fps) * TAU * 0.5) * 2 };
    case "breaking":
      return { ...base, mouthOpen: talk, browRaise: 0.6, smile: 0 };
    case "blink":
      return { ...base, eyesOpen: Math.abs(Math.cos((frame / fps) * TAU * 1.5)) };
    case "smile":
      return { ...base, smile: 1 };
    case "head-nod":
      return { ...base, nod: Math.sin((frame / fps) * TAU * 0.8) * 8 };
    case "hand-gesture":
      return { ...base, armAngle: 40 + Math.sin((frame / fps) * TAU * 0.8) * 20, mouthOpen: talk };
    case "wave":
      return { ...base, armAngle: 120 + Math.sin(frame * 0.6) * 25, smile: 0.8 };
    case "point":
      return { ...base, armAngle: 70, browRaise: 0.3 };
    case "listening":
      return { ...base, nod: Math.sin((frame / fps) * TAU * 0.4) * 3, browRaise: 0.2 };
    case "serious":
      return { ...base, browRaise: -0.5, smile: 0 };
    case "intro":
      return { ...base, mouthOpen: talk, armAngle: 100 + Math.sin(frame * 0.5) * 20, smile: 0.7 };
    case "outro":
      return { ...base, armAngle: 120 + Math.sin(frame * 0.6) * 25, smile: 1 };
    default:
      return base;
  }
}

/**
 * Pick a sensible animation for a scene kind when the instance is set to "auto".
 * This is what makes "anchor enters → reads headline → talks body → waves outro"
 * work with zero per-scene configuration, while remaining fully overridable.
 */
export function autoAnimationForScene(kind: string, isTalkingFamilyDefault = true): AnchorAnimationId {
  switch (kind) {
    case "intro":
      return "intro";
    case "headline":
      return "reading";
    case "body":
      return "talking";
    case "outro":
      return "outro";
    default:
      return isTalkingFamilyDefault ? "talking" : "idle";
  }
}

export function isTalking(animation: AnchorAnimationId): boolean {
  return TALKING.includes(animation);
}
