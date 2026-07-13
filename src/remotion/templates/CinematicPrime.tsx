import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { TemplateProps } from "./types";
import { useSlideIn, useTextReveal, useFadeIn, useBarGrow } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Cinematic Prime — a film-grade headline treatment: animated letterbox bars,
 * a top-corner kicker with an accent tick, a clip-reveal headline, and a
 * progress underline that fills across the lower third. Foreground only.
 */
export const CinematicPrime: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Letterbox bars slide in from top/bottom.
  const barHeight = interpolate(frame, [0, 20], [0, 96], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Underline fills across the whole clip for a "progress" feel. Guard the range
  // so it's strictly increasing even for a very short scene.
  const progress = interpolate(frame, [24, Math.max(25, durationInFrames)], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const kicker = useSlideIn("down", { delay: 14, duration: 18 });
  const headline = useTextReveal({ delay: 22, duration: 30 });
  const sub = useFadeIn({ delay: 40, duration: 22 });
  const meta = useFadeIn({ delay: 52, duration: 20 });
  const tick = useBarGrow({ delay: 12, duration: 16 });

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      {/* Cinematic letterbox bars */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barHeight, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barHeight, background: "#000" }} />

      {/* Kicker */}
      <div style={{ position: "absolute", top: 130, left: 80, ...kicker }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...tick, width: 46, height: 4, background: accent, transformOrigin: "left center" }} />
          <span style={{ color: accent, fontWeight: 900, fontSize: 24, letterSpacing: 6, textTransform: "uppercase" }}>
            {content.category}
          </span>
        </div>
      </div>

      {/* Headline block */}
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 200 }}>
        <div
          style={{
            ...headline,
            color: "#fff",
            fontSize: 76,
            lineHeight: 1.22,
            fontWeight: 900,
            letterSpacing: -1,
            textShadow: "0 6px 28px rgba(0,0,0,0.75)",
          }}
        >
          {content.headline}
        </div>
        {content.subtitle ? (
          <div style={{ ...sub, color: "#e5e7eb", fontSize: 30, fontWeight: 500, marginTop: 18, maxWidth: 1200 }}>
            {content.subtitle}
          </div>
        ) : null}

        {/* Progress underline */}
        <div style={{ marginTop: 26, height: 3, width: "100%", background: "rgba(255,255,255,0.14)", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: accent, borderRadius: 3 }} />
        </div>

        <div
          style={{
            ...meta,
            display: "flex",
            gap: 22,
            marginTop: 18,
            color: "#cbd5e1",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          <span>{content.reporter}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>{content.location}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>{formatDateTime(content.date, content.time)}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
