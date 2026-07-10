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

  // Per-slide durations in frames (min 1) + cumulative starts.
  const durations = slides.map((s) => Math.max(1, Math.round((s.durationSeconds || 1) * fps)));
  const total = durations.reduce((a, b) => a + b, 0);
  const looped = total > 0 ? ((frame % total) + total) % total : 0;

  return (
    <AbsoluteFill>
      {slides.map((slide, i) => {
        const start = durations.slice(0, i).reduce((a, b) => a + b, 0);
        const dur = durations[i];
        const local = looped - start;

        // Zoom toward the focal point: +zoomSpeed% scale per second from frame 0.
        const scale = 1 + ((slide.zoomSpeed || 0) / 100) * (local / fps);

        // Cross-fade: fade in at the slide's start, fade out at its end. The
        // previous/next slide underneath provides the other half of the blend.
        const opacity = interpolate(
          local,
          [-SLIDE_FADE_FRAMES, 0, dur - SLIDE_FADE_FRAMES, dur],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        // Skip slides that are fully off to keep the tree light.
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
