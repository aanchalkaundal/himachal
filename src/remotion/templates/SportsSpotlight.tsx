import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { TemplateProps } from "./types";
import { useSlideIn, useFadeIn } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Sports Spotlight — high-impact, stadium-energy layout: a skewed accent slab
 * sweeping up from the bottom, an oversized uppercase headline, and a bold
 * category tab. Foreground only.
 */
export const SportsSpotlight: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const frame = useCurrentFrame();

  // Diagonal slab sweeps in from the left.
  const slab = interpolate(frame, [4, 26], [-120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slabOpacity = interpolate(frame, [4, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tab = useSlideIn("left", { delay: 18, duration: 16 });
  const headline = useSlideIn("up", { delay: 24, duration: 22 }, 60);
  const meta = useFadeIn({ delay: 46, duration: 18 });

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily, overflow: "hidden" }}>
      {/* Skewed accent slab */}
      <div
        style={{
          position: "absolute",
          left: -80,
          right: -80,
          bottom: -60,
          height: 360,
          background: `linear-gradient(90deg, ${accent}, rgba(0,0,0,0.85))`,
          transform: `translateX(${slab}px) skewY(-4deg)`,
          opacity: slabOpacity,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
        }}
      />

      <div style={{ position: "absolute", left: 80, right: 80, bottom: 150 }}>
        {/* Category tab */}
        <div
          style={{
            ...tab,
            display: "inline-block",
            background: "#fff",
            color: "#0b1220",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: 4,
            padding: "8px 20px",
            textTransform: "uppercase",
            transform: `${(tab.transform as string) ?? ""} skewX(-8deg)`,
          }}
        >
          <span style={{ display: "inline-block", transform: "skewX(8deg)" }}>{content.category}</span>
        </div>

        {/* Impact headline */}
        <div
          style={{
            ...headline,
            color: "#fff",
            fontSize: 84,
            lineHeight: 0.98,
            fontWeight: 900,
            letterSpacing: -1,
            textTransform: "uppercase",
            marginTop: 16,
            textShadow: "0 6px 24px rgba(0,0,0,0.6)",
          }}
        >
          {content.headline}
        </div>

        {content.subtitle ? (
          <div style={{ ...meta, color: "#f1f5f9", fontSize: 28, fontWeight: 700, marginTop: 12 }}>
            {content.subtitle}
          </div>
        ) : null}

        <div
          style={{
            ...meta,
            display: "flex",
            gap: 20,
            marginTop: 14,
            color: "#e2e8f0",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {content.reporter ? <span>{content.reporter}</span> : null}
          {content.location ? <span style={{ opacity: 0.5 }}>|</span> : null}
          {content.location ? <span>{content.location}</span> : null}
          <span style={{ opacity: 0.5 }}>|</span>
          <span>{formatDateTime(content.date, content.time)}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
