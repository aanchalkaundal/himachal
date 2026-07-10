/**
 * Modular, reusable animation primitives.
 *
 * Each hook is a pure function of the current frame → a CSS style object, so
 * templates compose them without duplicating interpolation logic. All timing is
 * expressed in frames and derived from the composition fps, keeping animations
 * deterministic across 30/60 fps exports.
 */
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";

interface EnterOptions {
  /** Frame at which the animation starts. */
  delay?: number;
  /** Duration of the animation in frames. */
  duration?: number;
}

/** Fade from transparent to opaque. */
export function useFadeIn({ delay = 0, duration = 20 }: EnterOptions = {}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });
  return { opacity };
}

type Direction = "left" | "right" | "up" | "down";

/** Slide in from an edge while fading in. */
export function useSlideIn(
  direction: Direction = "left",
  { delay = 0, duration = 24 }: EnterOptions = {},
  distance = 80,
) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const offset = (1 - t) * distance;
  const map: Record<Direction, string> = {
    left: `translateX(${-offset}px)`,
    right: `translateX(${offset}px)`,
    up: `translateY(${offset}px)`,
    down: `translateY(${-offset}px)`,
  };
  return { opacity: t, transform: map[direction] };
}

/** Spring-driven zoom/scale entrance. */
export function useZoomIn({ delay = 0 }: EnterOptions = {}, from = 0.7) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [from, 1]);
  return { opacity: s, transform: `scale(${scale})` };
}

/** Subtle continuous scale ("Ken Burns"-lite) for background images. */
export function useKenBurns(amount = 0.08, durationInFrames = 300) {
  const frame = useCurrentFrame();
  const scale = 1 + interpolate(frame, [0, durationInFrames], [0, amount], {
    extrapolateRight: "clamp",
  });
  return { transform: `scale(${scale})` };
}

/** Clip-path text reveal (wipe left→right). */
export function useTextReveal({ delay = 0, duration = 26 }: EnterOptions = {}) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + duration], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return { clipPath: `inset(0 ${p}% 0 0)` };
}

/** Width grow, useful for lower-third bars and underlines. */
export function useBarGrow({ delay = 0, duration = 20 }: EnterOptions = {}) {
  const frame = useCurrentFrame();
  const scaleX = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { transform: `scaleX(${scaleX})`, transformOrigin: "left center" };
}
