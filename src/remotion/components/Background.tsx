import React from "react";
import { AbsoluteFill, Img, Loop, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundSlide, MediaAssets } from "@/types/project";
import { buildBackgroundGroups } from "@/types/project";
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

/** Frames used for the cross-fade between slideshow items. */
const SLIDE_FADE_FRAMES = 14;

/** Render one slide (image / video / text) with its Ken Burns zoom. `dur` is the
 * item's OWN effective duration in frames (used for the zoom-out fit math). */
const SlideItem: React.FC<{ slide: BackgroundSlide; local: number; dur: number; fps: number; accent: string }> = ({
  slide,
  local,
  dur,
  fps,
  accent,
}) => {
  // Zoom toward the focal point at zoomSpeed %/second.
  //  • Zoom IN  (zs > 0): starts fit (scale 1) → grows over time.
  //  • Zoom OUT (zs < 0): starts zoomed-in → shrinks to fit exactly at the end.
  const zs = slide.zoomSpeed || 0;
  const rate = Math.abs(zs) / 100;
  const localSec = local / fps;
  let scale: number;
  if (zs >= 0) {
    scale = 1 + rate * localSec;
  } else {
    const totalOut = rate * (dur / fps);
    scale = Math.max(1, 1 + totalOut - rate * localSec);
  }

  const isVideoChroma = slide.kind === "video" && slide.chromaKey;
  const offX = slide.offsetX || 0;
  const offY = slide.offsetY || 0;
  const size = slide.size ?? 1;
  return (
    <AbsoluteFill
      style={{
        // Position offset + size + zoom scale on ONE element (GPU-composited via
        // translateZ(0)) — avoids the subpixel "shake"/shimmer during zoom.
        transform: `translate(${offX}%, ${offY}%) scale(${scale * size}) translateZ(0)`,
        transformOrigin: `${slide.focalX}% ${slide.focalY}%`,
        filter: isVideoChroma ? "url(#nvg-greenscreen)" : undefined,
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    >
      {slide.kind === "text" ? (
        <TextCard slide={slide} accent={accent} />
      ) : slide.kind === "video" ? (
        (() => {
          const rateFor = slide.playbackRate && slide.playbackRate > 0 ? slide.playbackRate : 1;
          const video = (
            <OffthreadVideo
              src={slide.src}
              muted
              playbackRate={rateFor}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          );
          // Loop via OffthreadVideo + <Loop> — render-safe & memory-efficient. The
          // clip restarts every videoLen frames to fill a longer slide.
          const loopLen = Math.max(1, Math.round(((slide.videoDurationSeconds || 0) / rateFor) * fps));
          return slide.loop && slide.videoDurationSeconds ? <Loop durationInFrames={loopLen}>{video}</Loop> : video;
        })()
      ) : (
        <Img src={slide.src} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      )}
    </AbsoluteFill>
  );
};

/**
 * Background slideshow, grouped so each overlay rides ONLY on the base item just
 * before it (not over every item). Groups play in sequence once. Within a group:
 * the base fills the group's window; the scrim dims it; each overlay plays on top
 * for its OWN duration, capped to the base's window (an overlay can't outlast its
 * base). Deterministic — preview and export match.
 */
const SlideShow: React.FC<{ slides: BackgroundSlide[]; accent: string; scrim: number }> = ({ slides, accent, scrim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const groups = buildBackgroundGroups(slides);
  const durations = groups.map((g) => Math.max(1, Math.round(g.durationSeconds * fps)));
  const starts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));

  return (
    <AbsoluteFill>
      {groups.map((g, i) => {
        const start = starts[i];
        const groupDur = durations[i];
        const isLast = i === groups.length - 1;
        const local = frame - start;
        if (local < 0) return null;
        if (!isLast && local > groupDur) return null;

        // Cross-fade between groups (last group holds to the end).
        const gIn = i === 0 ? 1 : interpolate(local, [0, SLIDE_FADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const gOut = isLast ? 1 : interpolate(local, [groupDur - SLIDE_FADE_FRAMES, groupDur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const gOpacity = Math.min(gIn, gOut);
        if (gOpacity <= 0) return null;

        return (
          <AbsoluteFill key={i} style={{ opacity: gOpacity }}>
            {g.base ? <SlideItem slide={g.base} local={local} dur={groupDur} fps={fps} accent={accent} /> : null}

            {/* Scrim between the base and its overlays (base dimmed for legibility;
                overlays sit above, undimmed). */}
            {scrim > 0 ? <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} /> : null}

            {/* Overlays ride on THIS group's base, for their own duration but never
                longer than the base window. */}
            {g.overlays.map((ov) => {
              const ovDur = Math.min(Math.max(1, Math.round((ov.durationSeconds || 1) * fps)), groupDur);
              if (local > ovDur) return null; // overlay can't outlast its base
              const oIn = interpolate(local, [0, SLIDE_FADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const oOut = interpolate(local, [ovDur - SLIDE_FADE_FRAMES, ovDur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const oOpacity = Math.min(oIn, oOut);
              if (oOpacity <= 0) return null;
              return (
                <AbsoluteFill key={ov.id} style={{ opacity: oOpacity }}>
                  <SlideItem slide={ov} local={local} dur={ovDur} fps={fps} accent={accent} />
                </AbsoluteFill>
              );
            })}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Template-agnostic background layer. Precedence:
 *   1. background video
 *   2. background slideshow (grouped: base items + their attached overlays)
 *   3. single background image (slow Ken Burns push)
 *   4. themed gradient
 * A scrim keeps foreground text readable regardless of the underlying media.
 */
export const Background: React.FC<BackgroundProps> = ({ media, from, to, scrim = 0.35, accent = "#e11d2a" }) => {
  const ken = useKenBurns();
  const slides = media.backgroundSlides ?? [];

  return (
    <AbsoluteFill>
      {/* Themed gradient base — always present so green-screen-removed (transparent)
          media composites over the gradient instead of black. */}
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }} />

      {media.backgroundVideo ? (
        <>
          <OffthreadVideo src={media.backgroundVideo} muted style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} />
        </>
      ) : slides.length > 0 ? (
        // Slideshow handles the scrim per group (between base and its overlays).
        <SlideShow slides={slides} accent={accent} scrim={scrim} />
      ) : media.backgroundImage ? (
        <>
          <AbsoluteFill style={ken}>
            <Img src={media.backgroundImage} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} />
        </>
      ) : (
        <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} />
      )}
    </AbsoluteFill>
  );
};
