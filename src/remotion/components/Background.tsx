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
  /** Accent color for text-card presets (bars, quote marks, highlight). */
  accent?: string;
}

/**
 * Professional text-card presets. Each renders the typed text in a distinct
 * broadcast-standard layout, honoring the card's colors/size/alignment.
 */
const TextCard: React.FC<{ slide: BackgroundSlide; accent: string }> = ({ slide, accent }) => {
  const text = slide.text ?? "";
  const color = slide.textColor || "#ffffff";
  const bg = slide.bgColor || "transparent";
  const size = slide.fontSize || 64;
  const align = slide.align || "center";
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const shadow = "0 4px 18px rgba(0,0,0,0.55)";
  const style = slide.cardStyle || "plain";

  switch (style) {
    case "title":
      return (
        <AbsoluteFill style={{ background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
          <div style={{ color, fontSize: size, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.15, textAlign: "center", whiteSpace: "pre-wrap", textShadow: shadow }}>{text}</div>
          <div style={{ marginTop: 30, width: 170, height: 8, borderRadius: 8, background: accent }} />
        </AbsoluteFill>
      );
    case "banner":
      return (
        <AbsoluteFill style={{ background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: accent, padding: "30px 60px", maxWidth: "86%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ color, fontSize: size, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center", lineHeight: 1.15, whiteSpace: "pre-wrap" }}>{text}</div>
          </div>
        </AbsoluteFill>
      );
    case "quote":
      return (
        <AbsoluteFill style={{ background: bg, display: "flex", alignItems: "center", padding: "0 120px" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "stretch", maxWidth: "92%" }}>
            <div style={{ width: 10, background: accent, borderRadius: 8 }} />
            <div>
              <div style={{ color: accent, fontSize: size * 1.7, fontWeight: 900, lineHeight: 0.6, fontFamily: "Georgia, serif" }}>&ldquo;</div>
              <div style={{ color, fontSize: size, fontWeight: 700, fontStyle: "italic", lineHeight: 1.3, whiteSpace: "pre-wrap", marginTop: 10, textShadow: shadow }}>{text}</div>
            </div>
          </div>
        </AbsoluteFill>
      );
    case "lowerThird":
      return (
        <AbsoluteFill style={{ background: bg === "transparent" ? "transparent" : bg }}>
          <div style={{ position: "absolute", left: 80, bottom: 150, display: "flex", alignItems: "stretch", maxWidth: "70%" }}>
            <div style={{ width: 10, background: accent, borderRadius: 8, marginRight: 16 }} />
            <div style={{ background: "rgba(8,12,20,0.86)", backdropFilter: "blur(6px)", padding: "22px 34px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color, fontSize: size * 0.7, fontWeight: 800, lineHeight: 1.2, whiteSpace: "pre-wrap" }}>{text}</div>
            </div>
          </div>
        </AbsoluteFill>
      );
    case "gradient": {
      const g1 = bg === "transparent" ? "#0b1f3a" : bg;
      return (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, ${g1} 0%, #05070d 100%)`, display: "flex", alignItems: "center", justifyContent: justify, padding: "0 100px" }}>
          <div style={{ color, fontSize: size, fontWeight: 900, lineHeight: 1.15, textAlign: align, whiteSpace: "pre-wrap", textShadow: shadow }}>{text}</div>
        </AbsoluteFill>
      );
    }
    case "highlight":
      return (
        <AbsoluteFill style={{ background: bg === "transparent" ? "transparent" : bg, display: "flex", alignItems: "center", justifyContent: justify, padding: "0 90px" }}>
          <div style={{ fontSize: size, fontWeight: 900, lineHeight: 1.55, textAlign: align, maxWidth: "100%" }}>
            <span style={{ background: accent, color, padding: "6px 16px", WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}>{text}</span>
          </div>
        </AbsoluteFill>
      );
    default: // plain
      return (
        <AbsoluteFill style={{ background: bg, display: "flex", alignItems: "center", justifyContent: justify, padding: "0 90px" }}>
          <div style={{ color, fontSize: size, fontWeight: 800, lineHeight: 1.25, textAlign: align, whiteSpace: "pre-wrap", textShadow: shadow, maxWidth: "100%" }}>{text}</div>
        </AbsoluteFill>
      );
  }
};

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
const SlideShow: React.FC<{ slides: BackgroundSlide[]; accent: string }> = ({ slides, accent }) => {
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

        // Zoom toward the focal point at zoomSpeed %/second.
        //  • Zoom IN  (zs > 0): starts fit (scale 1) → grows over time.
        //  • Zoom OUT (zs < 0): starts zoomed-in → shrinks to fit (scale 1) exactly
        //    at the end of this slide (so the image fits the display by the end).
        const zs = slide.zoomSpeed || 0;
        const rate = Math.abs(zs) / 100; // scale change per second
        const localSec = local / fps;
        let scale: number;
        if (zs >= 0) {
          scale = 1 + rate * localSec;
        } else {
          const totalOut = rate * (dur / fps); // how much it zooms out over the slide
          scale = Math.max(1, 1 + totalOut - rate * localSec); // start 1+totalOut → 1 (never below fit)
        }

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
              {slide.kind === "text" ? (
                <TextCard slide={slide} accent={accent} />
              ) : slide.kind === "video" ? (
                <OffthreadVideo
                  src={slide.src}
                  muted
                  playbackRate={slide.playbackRate && slide.playbackRate > 0 ? slide.playbackRate : 1}
                  style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                    // Live green-screen removal for video via the SVG chroma-key filter.
                    filter: slide.chromaKey ? "url(#nvg-greenscreen)" : undefined,
                  }}
                />
              ) : (
                <Img src={slide.src} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
              )}
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
export const Background: React.FC<BackgroundProps> = ({ media, from, to, scrim = 0.35, accent = "#e11d2a" }) => {
  const ken = useKenBurns();
  const slides = media.backgroundSlides ?? [];
  const baseSlides = slides.filter((s) => (s.layer ?? "base") === "base");
  const overlaySlides = slides.filter((s) => s.layer === "overlay");

  return (
    <AbsoluteFill>
      {/* Themed gradient base — always present so green-screen-removed (transparent)
          media composites over the gradient instead of black. */}
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }} />

      {/* Base (background) layer */}
      {media.backgroundVideo ? (
        <OffthreadVideo src={media.backgroundVideo} muted style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      ) : baseSlides.length > 0 ? (
        <SlideShow slides={baseSlides} accent={accent} />
      ) : media.backgroundImage ? (
        <AbsoluteFill style={ken}>
          <Img src={media.backgroundImage} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </AbsoluteFill>
      ) : null}

      {/* Scrim darkens only the background so foreground text stays legible. */}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} />

      {/* Overlay layer — sits ABOVE the scrim (not dimmed), e.g. a green-screen
          subject composited over the background. */}
      {overlaySlides.length > 0 ? <SlideShow slides={overlaySlides} accent={accent} /> : null}
    </AbsoluteFill>
  );
};
