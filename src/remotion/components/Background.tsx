import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundSlide, MediaAssets } from "@/types/project";
import { useKenBurns } from "@/remotion/animations/presets";

interface BackgroundProps {
  media: MediaAssets;
  /** Fallback gradient colors when no media background is set. */
  from: string;
  to: string;
  /** Dark overlay opacity (0..1) to keep text legible over imagery. */
  scrim?: number;
}

/** Frames used for the cross-fade between slideshow images. */
const SLIDE_FADE_FRAMES = 14;

/**
 * A looping background slideshow. Each slide is shown for its own duration and
 * performs a Ken Burns zoom toward its focal point at its own speed. The whole
 * show loops to fill the video, and neighbouring slides cross-fade.
 *
 * Deterministic: the visible slide and its zoom are pure functions of the frame,
 * so the live preview and the server export are identical.
 */
const SlideShow: React.FC<{ slides: BackgroundSlide[] }> = ({ slides }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Per-slide durations in frames (min 1) + cumulative start frames. No looping:
  // slides play through ONCE, in order. Each image zooms exactly once. The last
  // image keeps holding + zooming until the video ends (it never restarts), so a
  // single image zooms continuously for the whole video with no repeat.
  const durations = slides.map((s) => Math.max(1, Math.round((s.durationSeconds || 1) * fps)));
  const starts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));

  return (
    <AbsoluteFill>
      {slides.map((slide, i) => {
        const start = starts[i];
        const dur = durations[i];
        const isLast = i === slides.length - 1;
        const local = frame - start; // frames since THIS slide appeared (unbounded)

        // Not on screen yet.
        if (local < 0) return null;
        // Fully finished (a later slide has taken over) — skip. The last slide is
        // never "finished": it holds to the end.
        if (!isLast && local > dur) return null;

        // Continuous zoom toward the focal point: +zoomSpeed% scale per second,
        // measured from when this slide appeared — never reset mid-slide.
        const scale = 1 + ((slide.zoomSpeed || 0) / 100) * (local / fps);

        // Cross-fade: first slide starts fully visible; others fade in as the
        // previous one fades out. Non-last slides fade out at their end.
        const fadeIn = i === 0 ? 1 : interpolate(local, [0, SLIDE_FADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const fadeOut = isLast
          ? 1
          : interpolate(local, [dur - SLIDE_FADE_FRAMES, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const opacity = Math.min(fadeIn, fadeOut);
        if (opacity <= 0) return null;

        return (
          <AbsoluteFill key={slide.id} style={{ opacity }}>
            <AbsoluteFill
              style={{
                transform: `scale(${scale})`,
                transformOrigin: `${slide.focalX}% ${slide.focalY}%`,
              }}
            >
              <Img src={slide.src} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            </AbsoluteFill>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Template-agnostic background layer. Precedence:
 *   1. background video
 *   2. background slideshow (multi-image, per-slide duration + zoom)
 *   3. single background image (slow Ken Burns push)
 *   4. themed gradient
 * A scrim keeps foreground text readable regardless of the underlying media.
 */
export const Background: React.FC<BackgroundProps> = ({ media, from, to, scrim = 0.35 }) => {
  const ken = useKenBurns();
  const slides = media.backgroundSlides ?? [];

  return (
    <AbsoluteFill>
      {media.backgroundVideo ? (
        <OffthreadVideo src={media.backgroundVideo} muted style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      ) : slides.length > 0 ? (
        <SlideShow slides={slides} />
      ) : media.backgroundImage ? (
        <AbsoluteFill style={ken}>
          <Img src={media.backgroundImage} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }} />
      )}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} />
    </AbsoluteFill>
  );
};
